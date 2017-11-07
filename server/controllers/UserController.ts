"use strict";
import {Request, Response} from "express";
import {JsonController, Req, Res, Param, Body, Get, Post,
        UseBefore, OnUndefined, BadRequestError} from "routing-controllers";
import {AppConfig} from "../config/AppConfig";
import {JWTAuthentication} from "../middleware/JWTAuthentication";
import {UserModel, User, LoginResult, UUID} from "../models/UserModel";
import {JWT} from "../auth/JWTSingleton";
import * as Validator from "validator";
import * as HTTP_STATUS_CODE from "http-status-codes";
import {Utils} from "../utils/Utils";

const apiVersion: string = "v1";

type ValidationResult = {
    isValid: boolean;
    errorMsg?: string;
};

@JsonController()
export class UserController {
    private jwt = JWT.getInstance();

    /**
     * @description Checks if passed mail-address is valid
     * @param {string} mail Mail-address to be validated
     * @param {boolean} mustBeInUse Determines if passed mail-address must be in use for being valid
     * @returns {Promise<ValidationResult>}
     */
    private async validateMail(mail: string, mustBeInUse: boolean): Promise<ValidationResult> {
        let errorMsg = "";

        if (!Validator.isEmail(mail)) {
            errorMsg = "Invalid mail-address!";
        } else {
            let isMailAddressInUse = await UserModel.isMailAddressInUse(mail);

            if (mustBeInUse && !isMailAddressInUse) {
                errorMsg = "Mail-address is not in use!";
            } else if (!mustBeInUse && isMailAddressInUse) {
                errorMsg = "Mail-address is already in use!";
            }
        }

        return errorMsg ? {isValid: false, errorMsg: errorMsg} : {isValid: true};
    }

    /**
     * @description Checks if passed password is valid and satisfies specific constraints
     * @param {string} password Password to be validated
     * @returns {ValidationResult}
     */
    private validatePassword(password: string): ValidationResult {
        const minPasswordLength = 12,
            controlCharRegExp = /[\x00-\x1F]/,
            leadingTrailingWhitespaceRegExp = /^ | $/;
        let errorMsg = "";

        if (!Validator.isLength(password, {min: minPasswordLength})) {
            errorMsg = `Password MUST contain at least ${minPasswordLength} characters!`;
        } else if (Validator.matches(password, controlCharRegExp)) {
            errorMsg = "Password MUST NOT contain control characters!";
        } else if (Validator.matches(password, leadingTrailingWhitespaceRegExp)) {
            errorMsg = "Password MUST NOT contain leading or trailing whitespace!";
        }

        return errorMsg ? {isValid: false, errorMsg: errorMsg} : {isValid: true};
    }

    /**
     * @description Checks if passed user-data are valid
     * @param {User} user User-data which shall be validated
     * @returns {Promise<ValidationResult}
     */
    private async validateUser(user: User): Promise<ValidationResult> {
        const pwValidationResult = this.validatePassword(user.password),
            errorMsg = pwValidationResult.errorMsg || (await this.validateMail(user.mail, false)).errorMsg;

        return errorMsg ? {isValid: false, errorMsg: errorMsg} : {isValid: true};
    }

    /**
     * @description Validates login results
     * @param {LoginResult} loginResult Login results to be validated
     * @returns {ValidationResult}
     */
    private validateLoginResult(loginResult: LoginResult): ValidationResult {
        let validationMsg = "";

        if (!(loginResult.userId && loginResult.correctPwd)) {
            validationMsg = "Invalid login credentials.";
        } else if (loginResult.isDeleted) {
            validationMsg = "Account has been banned.";
        } else if (!loginResult.isActivated) {
            validationMsg = "Account is not activated";
        }

        return validationMsg ? {isValid: false, errorMsg: validationMsg} : {isValid: true};
    }

    /**
     * @description Creates a new user-record if passed user-data are valid and
     * specified mail-address is not in use already.
     * In case passed user-data are not valid or in use an BadRequestError will be thrown.
     * @param {User} user Data for a new user-record
     */
    @Post(`/${apiVersion}/user`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async create(@Body({required: true}) user: User) {
        const validationResult: ValidationResult = await this.validateUser(user);
        let activationToken: string;

        if (validationResult.isValid) {
            activationToken = await UserModel.create(user);

            // Return activationToken in testmode for being able to test functionality in unit-tests
            if (AppConfig.APP_TESTMODE_ENABLED) {
                return activationToken;
            } else {
                // TBD: Send activation token via mail to user!
            }
        } else {
            throw new BadRequestError(`Account creation failed. ${validationResult.errorMsg}`);
        }
    }

    /**
     * @description Activates a user-account, determined by its activation token
     * @param {UUID} activationToken UUID of a activation-token
     * @param {number} testTokenExpiration Optional amount of hours an activation token is valid.
     *     Will only be considered if APP_TESTMODE_ENABLED is set to true,
     *     as parameters only purpose is enabling to test token expiration with unit-tests.
     */
    @Get(`/${apiVersion}/user/activation/:token`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async activate(@Param("token") activationToken: UUID, testTokenExpiration?: number) {
        const defaultTokenExpiration = 1,
            tokenValidForHours = Utils.getTestmodeDependingValue(testTokenExpiration, defaultTokenExpiration);
        let success: boolean;

        if (activationToken) {
            success = await UserModel.activate(activationToken, tokenValidForHours);

            if (!success) {
                throw new BadRequestError(`Activation of account failed.
                    Tokens are only valid for ${tokenValidForHours} hours. Please request a new activation token!`);
            }
        } else {
            throw new BadRequestError("Activation of account failed. Invalid registration-token format.");
        }
    }

    /**
     * @description Creates a fresh activation-token for a user, determined by its mail-address
     * @param {object} obj Wrapper for a mail-address belonging to a user-record
     * @param {string} obj.mail Mail address of a user-record a fresh activation-token shall be created for
     */
    @Post(`/${apiVersion}/user/activation/token`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async requestActivationToken(@Body({required: true}) {mail}: {mail: string}) {
        const mailMustBeInUse = true,
            validationResult = await this.validateMail(mail, mailMustBeInUse);
        let activationToken = "";

        if (validationResult.isValid) {
            activationToken = await UserModel.requestActivationToken(mail);

            if (activationToken) {
                // Return activationToken in testmode for being able to test functionality in unit-tests
                if (AppConfig.APP_TESTMODE_ENABLED) {
                    return activationToken;
                } else {
                    // TBD: Send activation token via mail to user!
                }
            } else {
                throw new BadRequestError(`Renewal of activation-token failed. Account must be activated already.`);
            }
        } else {
            throw new BadRequestError(`Renewal of activation-token failed. ${validationResult.errorMsg}`);
        }
    }

    /**
     * @description Adds JWT of user, determined by its login credentials,
     * to response as header in case credentials are valid
     * @param {User} user Login credentials of a user
     */
    @Post(`/${apiVersion}/user/login`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async login(@Body({required: true}) user: User, @Res() response: Response) {
        const loginResult = await UserModel.login(user),
            validationResult = this.validateLoginResult(loginResult);
        let token: string;

        if (validationResult.isValid) {
            token = await this.jwt.getUserJWT(loginResult.userId);
            Utils.addJWTToResponse(response, token);
        } else {
            throw new BadRequestError(`Authentication failed. ${validationResult.errorMsg}`);
        }
    }

    /**
     * @description Creates a password-reset token for a specific user-record,
     * which can be used for resetting the password
     * @param {object} obj Wrapper for a mail-address belonging to a user-record
     * @param {string} obj.mail Mail address of a user-record a password-reset-token shall be created for
     */
    @Post(`/${apiVersion}/user/forgotpw`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async forgotPw(@Body({required: true}) {mail}: {mail: string}) {
        const mailMustBeInUse = true,
            validationResult = await this.validateMail(mail, mailMustBeInUse);
        let pwResetToken = "";

        if (validationResult.isValid) {
            pwResetToken = await UserModel.createPasswordResetToken(mail);

            if (pwResetToken) {
                // Return pwResetToken in testmode for being able to test functionality in unit-tests
                if (AppConfig.APP_TESTMODE_ENABLED) {
                    return pwResetToken;
                } else {
                    // TBD: Send password-reset-token via mail to user!
                }
            } else {
                throw new BadRequestError(`Creation of password-reset-token failed.`);
            }
        } else {
            throw new BadRequestError(`Creation of password-reset-token failed. Invalid mail-address.`);
        }
    }

    /**
     * @description Sets the password of a user-account, determined by a valid password-reset-token,
     * to a specified value.
     * @param {string} token A valid password-reset-token
     * @param {object} obj Wrapper for a password
     * @param {string} obj.password Value the password of the user-account will be set to
     * @param {number} testTokenExpiration Optional amount of hours a password-reset-token is valid.
     *    Will only be considered if APP_TESTMODE_ENABLED is set to true,
     *    as parameters only purpose is enabling to test token expiration with unit-tests
     */
    @Post(`/${apiVersion}/user/resetpw/:token`)
    @OnUndefined(HTTP_STATUS_CODE.OK)
    async reset(@Param("token") token: string, {password}: {password: string}, testTokenExpiration?: number) {
        const defaultTokenExpiration = 1,
            tokenValidForHours = Utils.getTestmodeDependingValue(testTokenExpiration, defaultTokenExpiration),
            validationResult = this.validatePassword(password);
        let success: boolean;

        if (validationResult.isValid) {
            success = await UserModel.resetPw(token, password, tokenValidForHours);

            if (!success) {
                throw new BadRequestError(`Resetting password failed.
                    Tokens are only valid for ${tokenValidForHours} hours. Please request a new password-reset-token!`);
            }
        } else {
            throw new BadRequestError(`Resetting password failed. ${validationResult.errorMsg}`);
        }
    }

    /**
     * @description Sets the password of a user-account, determined by its JWT, to a specific new string
     * @param {object} obj Wrapper for a new password for the currently logged in user
     * @param {string} obj.password Value the password of the user-account will be set to
     * @returns {object} success
     */
    @Post(`/${apiVersion}/user/changepw`)
    @UseBefore(JWTAuthentication)
    async changePw(@Req() request: Request, @Body({required: true}) {password}: {password: string}): Promise<any> {
        if ((<any>request).user) {
            const {id: userId} = (<any> request).user,
                validationResult = this.validatePassword(password);
            let success: boolean;

            if (validationResult.isValid) {
                success = await UserModel.changePw(userId, password);

                return {
                    success: success
                };
            } else {
                throw new BadRequestError(`Changing password failed. ${validationResult.errorMsg}`);
            }
        } else {
            throw new BadRequestError(`Changing password failed. You are not logged in.`);
        }
    }

    /**
     * @description !!!Only for testing purposes!!!
     * Deletes a user-account, determined by its mail-address.
     * @param {string} mail Mail-address of the user-account to be deleted
     */
    async delete(mail: string): Promise<boolean> {
        return await UserModel.delete(mail);
    }
}
