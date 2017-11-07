"use strict";
import {use, assert} from "chai";
import {BadRequestError} from "routing-controllers";
import {UserController} from "../controllers/UserController";
import {JWT} from "../auth/JWTSingleton";

/**
 * add chai-as-promised to scope for having access to promise-specific asserts
 *
 * !ATTENTION!
 * chai-as-promised v.7.1.1 does not behave as described on:
 * https://github.com/domenic/chai-as-promised
 *
 * assert.isRejected(promise, Error, "optional message")
 * "optional message" is not really an optional message for describing the test-case,
 * but the /error message matcher/ as string. This string seems to be converted to RegExp
 * and tested on message of thrown Error. No custom messages may be added!
 */
use(require("chai-as-promised"));

const MockRequest = require("mock-express-request"),
    MockResponse = require("mock-express-response"),
    userController = new UserController(),
    minPwLength = 12,
    validMail = "abc@def.ghi",
    validPw = "a".repeat(minPwLength),
    authHeaderName = "Authorization",
    authHeaderValuePattern = /^Bearer (([0-9a-zA-Z\-_]{36,}\.[0-9a-zA-Z\-_]{36,}){2})$/,
    uuidPattern = /^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$/;

async function createTestAccount(): Promise<string> {
    return String(await userController.create({
        mail: validMail,
        password: validPw
    }));
}

describe("Creating user account", () => {
    it("Should throw as password is empty", async () => {
        return await assert.isRejected(userController.create({
            mail: validMail,
            password: ""
        }), BadRequestError);
    });

    it("Should throw as minimum password length is not reached", async () => {
        return await assert.isRejected(userController.create({
            mail: validMail,
            password: "a".repeat(minPwLength - 1)
        }), BadRequestError);
    });

    it("Should throw as password contains control characters", async () => {
        return await assert.isRejected(userController.create({
            mail: validMail,
            password: "\n" + validPw
        }), BadRequestError);
    });

    it("Should throw as password contains leading whitespace", async () => {
        return await assert.isRejected(userController.create({
            mail: validMail,
            password: " " + validPw
        }), BadRequestError);
    });

    it("Should throw as password contains trailing whitespace", async () => {
        return await assert.isRejected(userController.create({
            mail: validMail,
            password: validPw + " "
        }), BadRequestError);
    });

    it("Should throw as mail-address is empty", async () => {
        return await assert.isRejected(userController.create({
            mail: "",
            password: validPw
        }));
    });

    it("Should throw as mail-address is invalid", async () => {
        await assert.isRejected(userController.create({
            mail: "aaaa",
            password: validPw
        }));
        await assert.isRejected(userController.create({
            mail: "aaa@bbb.",
            password: validPw
        }));
        await assert.isRejected(userController.create({
            mail: "@bbb.cc",
            password: validPw
        }));
        return await assert.isRejected(userController.create({
            mail: "aaa@.cc",
            password: validPw
        }));
    });

    it("Should throw as mail-address is already in use", async () => {
        return await assert.isRejected(userController.create({
            mail: "bestof1950@domain.tld",
            password: validPw
        }));
    });

    it("Should successfully create new account", async () => {
        return await assert.isFulfilled(createTestAccount());
    });

    // clean up after test-suite --> remove created user-account from db
    after(async () => {
        return await userController.delete(validMail);
    });
});

describe("Activating user account", () => {
    it("Should throw as activation token is empty", async () => {
        return await assert.isRejected(userController.activate(""), BadRequestError);
    });

    it("Should throw as activation token has length 0", async () => {
        return await assert.isRejected(userController.activate(""), Error);
    });

    it("Should throw as activation token is unknown", async () => {
        return await assert.isRejected(userController.activate("00000000-0000-0000-0000-000000000000"),
            BadRequestError);
    });

    it("Should successfully activate account", async () => {
        const activationToken = await createTestAccount();

        assert.isDefined(activationToken, "activation-token must be defined");
        assert.isString(activationToken, "activation-token must be a string");
        assert.isNotEmpty(activationToken, "activation-token must not be empty");
        assert.match(activationToken, uuidPattern, "activation-token must match UUID pattern");
        return await assert.isFulfilled(userController.activate(activationToken));
    });

    it("Should throw as activation-token is expired", async () => {
        const activationToken = await createTestAccount();

        return await assert.isRejected(userController.activate(activationToken, 0));
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Requesting new activation-token", () => {
    it("Should throw as mail-address is empty", async () => {
        return await assert.isRejected(userController.requestActivationToken({
            mail: ""
        }), BadRequestError);
    });

    it("Should throw as mail-address is not in use", async () => {
        return await assert.isRejected(userController.requestActivationToken({
            mail: "aaa@bbb.cc"
        }), BadRequestError);
    });

    it("Should throw as user-account is already activated", async () => {
        return await assert.isRejected(userController.requestActivationToken({
            mail: "bestof1950@domain.tld"
        }));
    });

    it("Should successfully return new activation-token", async () => {
        let oldActivationToken = await createTestAccount(),
            newActivationToken = await userController.requestActivationToken({
                mail: validMail
            });

        assert.isString(newActivationToken, "new activation-token must be a string");
        assert.notStrictEqual(oldActivationToken, newActivationToken,
            "former and new activation-tokens must differ!");
        return await userController.delete(validMail);
    });

    it("Should throw as newly requested activation-token must invalidate all previous activation-tokens of user",
    async () => {
        let oldActivationToken = await createTestAccount();

        await userController.requestActivationToken({
            mail: validMail
        });
        return await assert.isRejected(userController.activate(oldActivationToken), BadRequestError);
    });

    it("Should be able to successfully activate account with new token", async () => {
        let activationToken;

        await createTestAccount();
        activationToken = await userController.requestActivationToken({
            mail: validMail
        });
        return await assert.isFulfilled(userController.activate(<string> activationToken));
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Logging into user account", () => {
    it("Should throw as mail-address is empty", async () => {
        const mockResponse = new MockResponse();

        return await assert.isRejected(userController.login({
            mail: "",
            password: validMail
        }, mockResponse), BadRequestError, "Invalid login credentials");
    });

    it("Should throw as password is empty", async () => {
        const mockResponse = new MockResponse();

        return await assert.isRejected(userController.login({
            mail: validMail,
            password: ""
        }, mockResponse), BadRequestError);
    });

    it("Should throw as login credentials are unknown", async () => {
        const mockResponse = new MockResponse();

        return await assert.isRejected(userController.login({
            mail: "aaa@bbb.ccc",
            password: "p4ssw0rd"
        }, mockResponse), BadRequestError);
    });

    it("Should throw as account is banned", async () => {
        const mockResponse = new MockResponse();

        return await assert.isRejected(userController.login({
            mail: "prankster@domain.tld",
            password: "bugmenot"
        }, mockResponse), BadRequestError);
    });

    it("Should throw as account is not activated", async () => {
        const mockResponse = new MockResponse();

        await createTestAccount();
        return await assert.isRejected(userController.login({
            mail: validMail,
            password: validPw
        }, mockResponse), BadRequestError);
    });

    it("Should successfully login", async () => {
        const mockResponse = new MockResponse(),
            jwtClient = JWT.getInstance();
        let authorizationHeader,
            jwt: string,
            user;

        await assert.isFulfilled(userController.login({
            mail: "bestof1950@domain.tld",
            password: "password"
        }, mockResponse));
        authorizationHeader = mockResponse.get(authHeaderName);
        assert.isDefined(authorizationHeader, `${authHeaderName}-header must be set in response`);
        assert.isString(authorizationHeader, `Value of ${authHeaderName} header must be of type string`);
        assert.isNotEmpty(authorizationHeader, `Value of ${authHeaderName} header must not be empty`);
        assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
        // Extract jwt from authorization-header
        jwt = (authHeaderValuePattern.exec(authorizationHeader) || [])[1];
        assert.isDefined(jwt, "JWT from authorization-header must be defined");
        assert.isString(jwt, "JWT from authorization-header must be of type string");
        user = (await jwtClient.verify(jwt));
        assert.isDefined(user, "User-data from JWT must be defined");
        assert.isNumber(user.id, "User-id from JWT must be of type number");
        return assert.isAbove(user.id, 0, "User-id must be above 0");
    });

    // clean up after test-suite --> remove created user-account from db
    after(async () => {
        return await userController.delete(validMail);
    });
});

describe("Requesting password-reset-token", () => {
    it("Should throw as mail-address is empty", async () => {
        return await assert.isRejected(userController.forgotPw({
            mail: ""
        }));
    });

    it("Should throw as mail-address is unknown", async () => {
        return await assert.isRejected(userController.forgotPw({
            mail: "aaa@bbb.cc"
        }));
    });

    it("Should successfully return password-reset-token", async () => {
        let pwResetToken: string;

        await createTestAccount();
        pwResetToken = String(await userController.forgotPw({
            mail: validMail
        }));

        assert.isDefined("Password-reset-token must be defined");
        assert.isString(pwResetToken, "Password-reset-token must be of type string");
        assert.isNotEmpty(pwResetToken, "Password-reset-token must not be empty");
        return assert.match(pwResetToken, uuidPattern, "Password-reset-token must match UUID pattern");
    });

    // clean up after test-suite --> remove created user-account from db
    after(async () => {
        return await userController.delete(validMail);
    });
});

describe("Resetting password", () => {
    it("Should throw as password is empty", async () => {
        return await assert.isRejected(userController.reset("", {password: ""}), BadRequestError);
    });

    it("Should throw as minimum password length is not reached", async () => {
        return await assert.isRejected(userController.reset("", {
            password: "a".repeat(minPwLength - 1)
        }), BadRequestError);
    });

    it("Should throw as password contains control characters", async () => {
        return await assert.isRejected(userController.reset("", {password: "\n" + validPw}), BadRequestError);
    });

    it("Should throw as password contains leading whitespace", async () => {
        return await assert.isRejected(userController.reset("", {password: " " + validPw}), BadRequestError);
    });

    it("Should throw as password contains trailing whitespace", async () => {
        return await assert.isRejected(userController.reset("", {password: validPw + " "}), BadRequestError);
    });

    it("Should throw as password-reset-token has length 0", async () => {
        return await assert.isRejected(userController.reset("", {password: validPw}), Error);
    });

    it("Should throw as password-reset-token is unknown", async () => {
        return await assert.isRejected(userController.reset("00000000-0000-0000-0000-000000000000",
            {password: validPw}), Error);
    });

    it("Should reset password to new value", async () => {
        const activationToken = await createTestAccount(),
            mockResponse = new MockResponse(),
            mockResponse2 = new MockResponse(),
            newPw = "N3W_P455W0RD";
        let authorizationHeader: string,
            pwResetToken: string;

        await assert.isFulfilled(userController.activate(activationToken));
        // Login should succeed, as credentials are unaltered
        await assert.isFulfilled(userController.login({
            mail: validMail,
            password: validPw
        }, mockResponse));
        authorizationHeader = mockResponse.get(authHeaderName);
        assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
        pwResetToken = <string> await userController.forgotPw({mail: validMail});
        // Set new password
        await assert.isFulfilled(userController.reset(pwResetToken, {
            password: newPw
        }));
        // Logging in with old credentials should fail
        await assert.isRejected(userController.login({
            mail: validMail,
            password: validPw
        }, new MockResponse()));
        // Logging in with new credentials should pass
        await assert.isFulfilled(userController.login({
            mail: validMail,
            password: newPw
        }, mockResponse2));
        authorizationHeader = mockResponse2.get(authHeaderName);
        return assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
    });

    it("Should throw as password-reset-token is expired", async () => {
        let pwResetToken;

        await createTestAccount();
        pwResetToken = await userController.forgotPw({mail: validMail});
        return await assert.isRejected(userController.activate(<string> pwResetToken, 0));
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Changing password", () => {
    it("Should throw as user is not logged in", async () => {
        const mockRequest = new MockRequest();

        return await assert.isRejected(userController.changePw(mockRequest, {
            password: "N3W_P455W0RD"
        }), BadRequestError);
    });

    it("Should throw as password is empty", async () => {
        const mockRequest = new MockRequest();

        (<any> mockRequest).user = {id: -1};
        return await assert.isRejected(userController.changePw(mockRequest, {password: ""}), BadRequestError);
    });

    it("Should throw as minimum password length is not reached", async () => {
        const mockRequest = new MockRequest();

        (<any> mockRequest).user = {id: -1};
        return await assert.isRejected(userController.changePw(mockRequest, {
            password: "a".repeat(minPwLength - 1)
        }), BadRequestError);
    });

    it("Should throw as password contains control characters", async () => {
        const mockRequest = new MockRequest();

        (<any> mockRequest).user = {id: -1};
        return await assert.isRejected(userController.changePw(mockRequest, {
            password: "\n" + validPw
        }), BadRequestError);
    });

    it("Should throw as password contains leading whitespace", async () => {
        const mockRequest = new MockRequest();

        (<any> mockRequest).user = {id: -1};
        return await assert.isRejected(userController.changePw(mockRequest, {
            password: " " + validPw
        }), BadRequestError);
    });

    it("Should throw as password contains trailing whitespace", async () => {
        const mockRequest = new MockRequest();

        (<any> mockRequest).user = {id: -1};
        return await assert.isRejected(userController.changePw(mockRequest, {
            password: validPw + " "
        }), BadRequestError);
    });

    it("Should change password to new value", async () => {
        const activationToken = await createTestAccount(),
            jwtClient: JWT = JWT.getInstance(),
            mockResponse = new MockResponse(),
            mockResponse2 = new MockResponse(),
            mockRequest = new MockRequest(),
            newPw = "N3W_P455W0RD";
        let authorizationHeader: string,
            jwt: string,
            user;

        await assert.isFulfilled(userController.activate(activationToken));
        // Login should succeed, as credentials are unaltered
        await assert.isFulfilled(userController.login({
            mail: validMail,
            password: validPw
        }, mockResponse));
        authorizationHeader = mockResponse.get(authHeaderName);
        assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
        // Extract token from authorization-header
        jwt = (authHeaderValuePattern.exec(authorizationHeader) || [])[1];
        user = (await jwtClient.verify(jwt));
        // Change password
        mockRequest.user = user;
        await assert.isFulfilled(userController.changePw(mockRequest, {
            password: newPw
        }));
        // Logging in with old credentials should fail
        await assert.isRejected(userController.login({
            mail: validMail,
            password: validPw
        }, new MockResponse()));
        // Logging in with new credentials should pass
        await assert.isFulfilled(userController.login({
            mail: validMail,
            password: newPw
        }, mockResponse2));
        authorizationHeader = mockResponse2.get(authHeaderName);
        return assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

