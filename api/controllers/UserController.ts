"use strict";
import {Request, Response} from "express";
import {JsonController, Req, Res, Param, Body, Get, Post, UseBefore} from "routing-controllers";
import {AppConfig} from "../config/AppConfig";
import {JWTAuthentication} from "../middleware/JWTAuthentication";
import {UserModel, User, LoginResult, UUID} from "../models/UserModel";
import {JWT} from "../auth/JWTSingleton";
import * as Validator from "validator";
import * as HTTP_STATUS_CODE from "http-status-codes";
import {AppMailer} from "../mail/AppMailer";
import {Utils} from "../utils/Utils";
import {JSONResponse} from "../types/JSONResponse";

const apiVersion: string = "v1";

type ValidationResult = {
    isValid: boolean;
    errorMsg?: string;
};

@JsonController()
export class UserController {
    private jwt = JWT.getInstance();
    /**
     * @member Number of hours an activation-token will be valid
     */
    private activationTokenExpiration = 1;
    /**
     * @member Number of hours an password-reset-token will be valid
     */
    private passwordResetTokenExpiration = 1;

    /**
     * @description Checks if passed mail-address is valid
     * @param {string} mail Mail-address to be validated
     * @param {boolean} mustBeInUse Determines if passed mail-address must be in use for being valid
     * @returns {Promise<ValidationResult>}
     */
    private async validateMail(mail: string, mustBeInUse: boolean): Promise<ValidationResult> {
        let errorMsg = "";

        if (!Validator.isEmail(mail)) {
            errorMsg = "Invalid mail-address.";
        } else {
            let isMailAddressInUse = await UserModel.isMailAddressInUse(mail);

            if (mustBeInUse && !isMailAddressInUse) {
                errorMsg = "Mail-address is not in use.";
            } else if (!mustBeInUse && isMailAddressInUse) {
                errorMsg = "Mail-address is already in use.";
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
            errorMsg = `Password MUST contain at least ${minPasswordLength} characters.`;
        } else if (Validator.matches(password, controlCharRegExp)) {
            errorMsg = "Password MUST NOT contain control characters.";
        } else if (Validator.matches(password, leadingTrailingWhitespaceRegExp)) {
            errorMsg = "Password MUST NOT contain leading or trailing whitespace.";
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
            validationMsg = "Account has been disabled.";
        } else if (!loginResult.isActivated) {
            validationMsg = "Account is not activated.";
        }
        return validationMsg ? {isValid: false, errorMsg: validationMsg} : {isValid: true};
    }

    /**
     * @description Creates a new user-record if passed user-data are valid and
     * specified mail-address is not in use already.
     * In case passed user-data are not valid or in use an BadRequestError will be thrown.
     * @param {User} user Data for a new user-record
     * @param {Response} response Response of current request
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user`)
    async create(@Body({required: true}) user: User, @Res() response: Response): Promise<JSONResponse> {
        const validationResult: ValidationResult = await this.validateUser(user);
        let activationToken: string,
            jsonResponse: JSONResponse = {
                success: false
            };

        if (validationResult.isValid) {
            activationToken = await UserModel.create(user);

            jsonResponse.success = true;
            // Do not send mails in testmode, but return activationToken for unit-testing
            if (AppConfig.APP_TESTMODE_ENABLED) {
                jsonResponse.testExclusive = activationToken;
            } else {
                await AppMailer.sendRegistrationMail({
                    to: user.mail,
                    activationToken,
                    tokenExpiresAfter: this.activationTokenExpiration
                });
            }
        } else {
            response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
            jsonResponse.error = `Account creation failed. ${validationResult.errorMsg}`;
        }
        return jsonResponse;
    }

    /**
     * @description Activates a user-account, determined by its activation token
     * @param {UUID} activationToken UUID of a activation-token
     * @param {Response} response Response of current request
     * @param {number} testTokenExpiration Optional number of hours an activation token is valid.
     *     Will only be considered if APP_TESTMODE_ENABLED is set to true,
     *     as parameters only purpose is enabling to test token expiration with unit-tests.
     * * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Get(`/${apiVersion}/user/activation/:token`)
    async activate(@Param("token") activationToken: UUID,
                    @Res() response: Response, testTokenExpiration?: number): Promise<JSONResponse> {
        const tokenValidForHours = Utils.getTestmodeDependingValue(testTokenExpiration, this.activationTokenExpiration);
        let success: boolean,
            jsonResponse: JSONResponse = {
                success: false
            };

        try {
            if (activationToken) {
                success = await UserModel.activate(activationToken, tokenValidForHours);

                if (success) {
                    jsonResponse.success = true;
                } else {
                    throw new TypeError(`Tokens are only valid for ${tokenValidForHours} hours.
                        Please request a new activation token!`);
                }
            } else {
                throw new TypeError("Invalid registration-token format.");
            }
        } catch (e) {
            response.status(HTTP_STATUS_CODE.NOT_FOUND);
            // Only messages of custom errors, which are of type TypeError, should be exposed
            jsonResponse.error = `Activation of account failed.${e instanceof TypeError ? " " + e.message : ""}`;
        }
        return jsonResponse;
    }

    /**
     * @description Creates a fresh activation-token for a user, determined by its mail-address
     * @param {object} obj Wrapper for a mail-address belonging to a user-record
     * @param {string} obj.mail Mail address of a user-record a fresh activation-token shall be created for
     * @param {Response} response Response of current request
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user/activation/token`)
    async requestActivationToken(@Body({required: true}) {mail}: {mail: string}, @Res() response: Response) {
        const mailMustBeInUse = true,
            validationResult = await this.validateMail(mail, mailMustBeInUse);
        let activationToken = "",
            jsonResponse: JSONResponse = {
                success: false
            };

        try {
            if (validationResult.isValid) {
                activationToken = await UserModel.requestActivationToken(mail);

                if (activationToken) {
                    jsonResponse.success = true;
                    // Do not send mails in testmode, but return activationToken for unit-testing
                    if (AppConfig.APP_TESTMODE_ENABLED) {
                        jsonResponse.testExclusive = activationToken;
                    } else {
                        await AppMailer.sendActivationTokenMail({
                            to: mail,
                            activationToken,
                            tokenExpiresAfter: this.activationTokenExpiration
                        });
                    }
                } else {
                    throw new TypeError(`Account must be activated already.`);
                }
            } else {
                throw new TypeError(`${validationResult.errorMsg}`);
            }
        } catch (e) {
            response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
            // Only messages of custom errors, which are of type TypeError, should be exposed
            jsonResponse.error = `Renewal of activation-token failed.${e instanceof TypeError ? " " + e.message : ""}`;
        }
        return jsonResponse;
    }

    /**
     * @description Adds JWT of user, determined by its login credentials,
     * to response as header in case credentials are valid
     * @param {User} user Login credentials of a user
     * @param {Response} response Response of current request
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user/login`)
    async login(@Body({required: true}) user: User, @Res() response: Response): Promise<JSONResponse> {
        const loginResult = await UserModel.login(user),
            validationResult = this.validateLoginResult(loginResult);
        let token: string,
            jsonResponse: JSONResponse = {
                success: false
            };

        if (validationResult.isValid) {
            token = await this.jwt.getUserJWT(loginResult.userId);
            Utils.addJWTToResponse(response, token);
            jsonResponse.success = true;
        } else {
            jsonResponse.error = `Authentication failed. ${validationResult.errorMsg}`;
            response.status(HTTP_STATUS_CODE.UNAUTHORIZED);
        }
        return jsonResponse;
    }

    /**
     * @description Creates a password-reset token for a specific user-record,
     * which can be used for resetting the password
     * @param {object} obj Wrapper for a mail-address belonging to a user-record
     * @param {string} obj.mail Mail address of a user-record a password-reset-token shall be created for
     * @param {Response} response Response for current request
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user/forgotpw`)
    async forgotPw(@Body({required: true}) {mail}: {mail: string}, @Res() response: Response): Promise<JSONResponse> {
        const mailMustBeInUse = true,
            validationResult = await this.validateMail(mail, mailMustBeInUse);
        let pwResetToken = "",
            jsonResponse: JSONResponse = {
                success: false
            };

        if (validationResult.isValid) {
            pwResetToken = await UserModel.createPasswordResetToken(mail);

            // Do not send mails in testmode, but return pwResetToken for unit-testing
            jsonResponse.success = true;
            if (AppConfig.APP_TESTMODE_ENABLED) {
                jsonResponse.testExclusive = pwResetToken;
            } else {
                await AppMailer.sendForgotPwMail({
                    to: mail,
                    pwResetToken,
                    tokenExpiresAfter: this.passwordResetTokenExpiration
                });
            }
        } else {
            response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
            jsonResponse.error = `Creation of password-reset-token failed. ${validationResult.errorMsg}`;
        }
        return jsonResponse;
    }

    /**
     * @description Sets the password of a user-account, determined by a valid password-reset-token,
     * to a specified value.
     * @param {string} token A valid password-reset-token
     * @param {object} obj Wrapper for a password
     * @param {string} obj.password Value the password of the user-account will be set to
     * @param {Response} response Response for current request
     * @param {number} testTokenExpiration Optional number of hours a password-reset-token is valid.
     *    Will only be considered if APP_TESTMODE_ENABLED is set to true,
     *    as parameters only purpose is enabling to test token expiration with unit-tests
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user/resetpw/:token`)
    async reset(@Param("token") token: string, @Body({required: true}) {password}: {password: string},
                @Res() response: Response, testTokenExpiration?: number): Promise<JSONResponse> {
        const tokenValidForHours = Utils.getTestmodeDependingValue(testTokenExpiration,
                                                                this.passwordResetTokenExpiration),
            validationResult = this.validatePassword(password);
        let success: boolean,
            jsonResponse: JSONResponse = {
                success: false
            };

        try {
            if (validationResult.isValid) {
                if (token.length) {
                    success = await UserModel.resetPw(token, password, tokenValidForHours);

                    if (success) {
                        jsonResponse.success = true;
                    } else {
                        throw new TypeError(`Tokens are only valid for ${tokenValidForHours} hours.
                            Please request a new password-reset-token!`);
                    }
                } else {
                    throw new TypeError(`Invalid password-reset token.`);
                }
            } else {
                throw new TypeError(`${validationResult.errorMsg}`);
            }
        } catch (e) {
            response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
            // Only messages of custom errors, which are of type TypeError, should be exposed
            jsonResponse.error = `Resetting password failed.${e instanceof TypeError ? " " + e.message : ""}`;
        }
        return jsonResponse;
    }

    /**
     * @description Sets the password of a user-account, determined by its JWT, to a specific new string
     * @param {object} obj Wrapper for a new password for the currently logged in user
     * @param {string} obj.password Value the password of the user-account will be set to
     * @param {Response} response Response for current request
     * @returns {Promise<JSONResponse>} Result of current request, which specifies if request was successful
     *                          with an optional error message
     */
    @Post(`/${apiVersion}/user/changepw`)
    @UseBefore(JWTAuthentication)
    async changePw(@Req() request: Request, @Body({required: true}) {password}: {password: string},
                    @Res() response: Response
    ): Promise<JSONResponse> {
        let jsonResponse: JSONResponse = {
            success: false
        };

        try {
            if ((<any>request).user) {
                const {id: userId} = (<any> request).user,
                    validationResult = this.validatePassword(password);
                let success: boolean;

                if (validationResult.isValid) {
                    success = await UserModel.changePw(userId, password);

                    if (success) {
                        jsonResponse.success = true;
                    } else {
                        response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
                        throw new TypeError("Unknown user");
                    }
                } else {
                    response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
                    throw new TypeError(`${validationResult.errorMsg}`);
                }
            } else {
                response.status(HTTP_STATUS_CODE.UNAUTHORIZED);
                throw new TypeError(`You are not logged in.`);
            }
        } catch (e) {
            // Only messages of custom errors, which are of type TypeError, should be exposed
            jsonResponse.error = `Changing password failed.${e instanceof TypeError ? " " + e.message : ""}`;
        }
        return jsonResponse;
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
