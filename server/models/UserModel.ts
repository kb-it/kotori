"use strict";
import {PGClientSingleton} from "../db/PGClientSingleton";
import {QueryResult} from "pg";

export type UUID = string;
export type User = {
    mail: string;
    password: string;
};
export type LoginResult = {
    userId: number;
    correctPwd: boolean;
    isActivated: boolean;
    isDeleted: boolean;
};

enum TOKEN_TYPE {
    ACTIVATION,
    PASSWORD_RESET
}

export class UserModel {
    private static pgClient = PGClientSingleton.getClient();

    /**
     * @description Inserts a new user-record into db
     * @param {User} user Data for new user-record
     * @returns {Promise<number>} Id of newly created user-record
     */
    private static async createUser(user: User): Promise<number> {
        const sql = `INSERT INTO "user"(mail, password, is_deleted)
                VALUES ($1, crypt($2, gen_salt('bf', 8)), 0::BOOLEAN)
                RETURNING id`,
            [firstResultRows] = (await this.pgClient.query(sql, [user.mail, user.password])).rows,
            {id} = firstResultRows;

        return id;
    }

    /**
     * @description Inserts a new activation-token-record for a specific user into db and returns it
     * @param {number} userId Id of user, whose activation-token shall be created
     * @returns {Promise<string>} token
     */
    private static async createActivationToken(userId: number): Promise<string> {
        const sql = `INSERT INTO user_token(id_user, registration)
                VALUES ($1, 1::BOOLEAN)
                RETURNING token`,
            [firstResultRows] = (await this.pgClient.query(sql, [userId])).rows,
            {token} = firstResultRows;

        return token;
    }

    /**
     * Returns particular sql-constraints part for creting a new token of a specific type
     * @param tokenType
     */
    private static getSQLConstraintsForTokenCreation(tokenType: TOKEN_TYPE): string {
        let constraints: string;

        switch (tokenType) {
            case TOKEN_TYPE.ACTIVATION:
                /**
                 * User accounts may only be activated once. As all activation tokens of a user-account be deleted
                 * during activation, new activation-tokens may only be created while user has related activation tokens
                 */
                constraints = `
                    SELECT "user".id
                    FROM user_token
                    INNER JOIN "user"
                    ON "user".mail = $1 AND user_token.id_user = "user".id AND user_token.registration = 1::BOOLEAN
                `;
                break;
            case TOKEN_TYPE.PASSWORD_RESET:
                constraints = `SELECT id
                    FROM "user"
                    WHERE mail = $1`;
                break;
            default:
                throw TypeError("Unknown token type!");
        }

        return constraints;
    }

    /**
     * @description Creates a fresh token of a specific type for a user determined by its mail-address.
     * Either a activation or a password-reset-token can be created.
     * All existing tokens of this type belonging to the specified user are removed before.
     * @param {string} mail Mail address of a user-record a fresh token shall be created for
     * @param {TOKEN_TYPE} tokenType Type of token, which shall be created
     * @returns {Promise<string>} UUID of the freshly created token
     */
    private static async createDistinctToken(mail: string, tokenType: TOKEN_TYPE): Promise<string> {
        const isActivationToken = tokenType === TOKEN_TYPE.ACTIVATION,
            sqlConstraints = this.getSQLConstraintsForTokenCreation(tokenType),
            sql = `WITH user_data AS (
                    ${sqlConstraints}
                ),
                token_deletion AS (
                    DELETE FROM user_token
                    WHERE registration = $2::BOOLEAN AND id_user IN (
                        SELECT id
                        FROM user_data
                    )
                )
                INSERT INTO user_token(id_user, registration)
                SELECT id, $2::BOOLEAN
                FROM user_data
                RETURNING token`,
            [firstResultRows] = (await this.pgClient.query(sql, [mail, isActivationToken])).rows;
        let token = firstResultRows && firstResultRows.token;

        return token;
    }

    /**
     * @description Checks if a specific mail-address belongs to an existing user-record
     * @param {string} mailAddr Mail-address, which shall be seeked in db
     * @returns {Promise<boolean>} True if mail-address is currently in use
     */
    public static async isMailAddressInUse(mailAddr: string): Promise<boolean> {
        const sql = `SELECT EXISTS(SELECT 1 FROM "user" WHERE mail = $1) AS is_in_use`,
            [firstResultRows] = (await this.pgClient.query(sql, [mailAddr])).rows,
            {is_in_use: isInUse} = firstResultRows;

        return isInUse;
    }

    /**
     * @description Creates a new user-record and a activation-token for this user
     * @param {Promise<User>} user Data for new user-record
     */
    public static async create(user: User): Promise<UUID> {
        const userId = await this.createUser(user),
            activationToken = await this.createActivationToken(userId);

        return activationToken;
    }

    /**
     * @description Activates a user-account, determined by its activation-token
     * @param {UUID} token UUID of a activation-token, whose related user-account shall be activated
     * @param {number} tokenValidForHours Activation token is only valid for specified amount of hours
     * @returns {Promise<boolean>} True if token was valid and activation was successful
     */
    public static async activate(token: UUID, tokenValidForHours: number): Promise<boolean> {
        const sql = `WITH token_deletion AS (
                    DELETE FROM user_token
                    WHERE token = $1 AND registration = 1::BOOLEAN AND created_at > NOW() - $2::INTERVAL
                    RETURNING id
                )
                SELECT NOT COUNT(*) = 0 AS success
                FROM token_deletion`;
        const [firstResultRows] = (await this.pgClient.query(sql, [token, tokenValidForHours + " hours"])).rows,
            {success} = firstResultRows;

        return success;
    }

    /**
     * @description Creates a fresh activation token for a user determined by its mail-address. Removes all existing
     * activation-tokens of the specified user before.
     * @param {string} mail Mail address of a user-record the fresh activation-token shall be created for
     * @returns {Promise<UUID>} UUID of the freshly created activation-token
     */
    public static async requestActivationToken(mail: string): Promise<UUID> {
        const token = await this.createDistinctToken(mail, TOKEN_TYPE.ACTIVATION);

        return token;
    }

    /**
     * @description Checks if passed login credentials match a stored user-record and returns login-results
     * @param {User} user Login credentials of a specific user-record
     * @returns {Promise<LoginResult>}
     */
    public static async login(user: User): Promise<LoginResult> {
        const sql = `SELECT
                    "user".id AS user_id,
                    "user".password = crypt($2, password) AS correct_password,
                    "user".is_deleted,
                    COUNT(user_token.id) = 0 AS is_activated
                FROM "user"
                LEFT JOIN user_token ON "user".id = user_token.id_user AND user_token.registration = 1::BOOLEAN
                WHERE "user".mail = $1
                GROUP BY "user".id`,
            queryResultRows = (await this.pgClient.query(sql, [user.mail, user.password])).rows;
        let loginResult: LoginResult = {
            userId: 0,
            correctPwd: false,
            isDeleted: false,
            isActivated: false
        };

        if (queryResultRows.length) {
            [{
                user_id: loginResult.userId,
                correct_password: loginResult.correctPwd,
                is_deleted: loginResult.isDeleted,
                is_activated: loginResult.isActivated
            }] = queryResultRows;
        }
        return loginResult;
    }

    /**
     * @description Creates a new password-reset-token for a user-record, determined by its mail-address
     * @param {string} mail Mail address of a user-record a password-reset-token will be created for
     * @returns {Promise<UUID>} UUID of the freshly created password-reset-token
     */
    public static async createPasswordResetToken(mail: string): Promise<UUID> {
        const token = await this.createDistinctToken(mail, TOKEN_TYPE.PASSWORD_RESET);

        return token;
    }

    /**
     * @description Sets the password of a user-account, determined by a valid password-reset-token,
     * to a specific new value.
     * Password-reset-tokens are only valid for a specified amount of hours.
     * @param {UUID} token UUID of a password-reset-token, whose related user-account's password will be reset
     * @param {string} password Password will be reset to this value
     * @param {number} tokenValidForHours Token must have been created within specified amount of hours ago
     *                                     for being valid
     * @returns {Promise<boolean>} success
     */
    public static async resetPw(token: UUID, password: string, tokenValidForHours: number): Promise<boolean> {
        const sql = `WITH token_deletion AS (
                    DELETE FROM user_token
                    WHERE token = $1 AND registration = 0::BOOLEAN AND created_at > NOW() - $2::INTERVAL
                    RETURNING id_user
                ), pw_reset AS (
                    UPDATE "user"
                    SET password = crypt($3, gen_salt('bf', 8))
                    FROM token_deletion
                    WHERE id = id_user
                    RETURNING id
                )
                SELECT NOT COUNT(*) = 0 AS success
                FROM pw_reset`,
            [firstResultRows] = (await this.pgClient.query(sql, [token, tokenValidForHours + " hours", password])).rows,
            {success} = firstResultRows;

        return success;
    }

    /**
     * @description Sets the password of a user-account, determined by its userId, to a specific new string
     * @param {number} userId ID of a user-record
     * @param {string} password Value the password of the determined user-record will be set to
     * @returns {Promise<boolean>} success
     */
    public static async changePw(userId: number, password: string): Promise<boolean> {
        const sql = `WITH pw_change AS (
                    UPDATE "user"
                    SET password = crypt($1, gen_salt('bf', 8))
                    WHERE id = $2
                    RETURNING id
                )
                SELECT NOT COUNT(*) = 0 AS success
                FROM pw_change`,
            [firstResultRows] = (await this.pgClient.query(sql, [password, userId])).rows,
            {success} = firstResultRows;

        return success;
    }

    /**
     * @description !!!Only for testing purposes!!!
     * Deletes a user-account, determined by its mail-address.
     * @param {string} mail Mail-address of the user-account to be deleted
     */
    public static async delete(mail: string): Promise<boolean> {
        const sql = `WITH user_deletion AS (
                    DELETE FROM "user"
                    WHERE mail = $1
                    RETURNING id
                )
                SELECT COUNT(*) = 1 AS success
                FROM user_deletion`,
            [firstResultRows] = (await this.pgClient.query(sql, [mail])).rows,
            {success} = firstResultRows;

        return success;
    }
}
