"use strict";
import {assert} from "chai";
import {UserController} from "../controllers/UserController";
import {JWT} from "../auth/JWTSingleton";
import * as HTTP_STATUS_CODE from "http-status-codes";
import {JSONResponse} from "../types/JSONResponse";

const MockRequest = require("mock-express-request"),
    MockResponse = require("mock-express-response"),
    userController = new UserController(),
    minPwLength = 12,
    validMail = "abc@def.ghi",
    validPw = "a".repeat(minPwLength),
    authHeaderName = "Authorization",
    authHeaderValuePattern = /^Bearer (([0-9a-zA-Z\-_]{36,}\.[0-9a-zA-Z\-_]{36,}){2})$/,
    uuidPattern = /^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$/;

async function createTestAccount(): Promise<{jsonRes: JSONResponse, mockRes: any}> {
    const mockResponse = new MockResponse();

    return {
        jsonRes: await userController.create({
            mail: validMail,
            password: validPw
        }, mockResponse),
        mockRes: mockResponse
    };
}

describe("Creating user account", () => {
    it("Should fail as password is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: validMail,
                password: ""
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least .* characters/i,
            "correct error message must be returned");
    });

    it("Should fail as minimum password length is not reached", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: validMail,
                password: "a".repeat(minPwLength - 1)
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as minimum password length is not reached");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least .* characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains control characters", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: validMail,
                password: "\n" + validPw
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as minimum password length is not reached");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain control characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains leading whitespace", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: validMail,
                password: " " + validPw
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains leading whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains trailing whitespace", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: validMail,
                password: validPw + " "
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains trailing whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as mail-address is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: "",
                password: validPw
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid mail-address/i,
            "correct error message must be returned");
    });

    it("Should fail as mail-address is invalid", async () => {
        const invalidMailAddresses = [
            "aaaa",
            "aaa@bbb.",
            "@bbb.cc",
            "aaa@.cc"
        ];

        for (let invalidMailAddress of invalidMailAddresses) {
            const mockResponse = new MockResponse(),
                jsonResponse = await userController.create({
                    mail: "aaaa",
                    password: validPw
                }, mockResponse);

            assert.strictEqual(mockResponse.statusCode,
                                HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
            assert.isDefined(jsonResponse, "must return json as response");
            assert.isFalse(jsonResponse.success, `must fail as mail-address ${invalidMailAddress} is invalid`);
            assert.isString(jsonResponse.error, "error message must be returned");
            assert.match(String(jsonResponse.error), /Invalid mail-address/i,
                "correct error message must be returned");
        }
        return true;
    });

    it("Should fail as mail-address is already in use", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.create({
                mail: "bestof1950@domain.tld",
                password: validPw
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, `must fail as mail-address is already in use`);
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Mail-address is already in use/i,
            "correct error message must be returned");
    });

    it("Should successfully create new account", async () => {
        const {jsonRes: jsonResponse, mockRes: mockResponse} = await createTestAccount();

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, `must succeed`);
        return assert.isUndefined(jsonResponse.error, "error message must not be returned");
    });

    // clean up after test-suite --> remove created user-account from db
    after(async () => {
        return await userController.delete(validMail);
    });
});

describe("Activating user account", () => {
    it("Should fail as activation token is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.activate("", mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.NOT_FOUND, "should send http-status 404");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, `must fail as activation-token is empty`);
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid registration-token format/i,
            "correct error message must be returned");
    });

    it("Should fail as activation token is unknown", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.activate("00000000-0000-0000-0000-000000000000", mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                             HTTP_STATUS_CODE.NOT_FOUND, "should send http-status 404");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, `must fail as activation-token is unknown`);
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Tokens are only valid for \d+ hours/i,
            "correct error message must be returned");
    });

    it("Should successfully activate account", async () => {
        const {jsonRes: createResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: activationToken} = createResponse,
            mockResponse = new MockResponse();
        let jsonResponse;

        assert.isDefined(activationToken, "activation-token must be defined");
        assert.isString(activationToken, "activation-token must be a string");
        assert.isNotEmpty(activationToken, "activation-token must not be empty");
        assert.match(activationToken, uuidPattern, "activation-token must match UUID pattern");

        jsonResponse = await userController.activate(activationToken, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, `must succeed`);
        return assert.isUndefined(jsonResponse.error, "error message must not be returned");
    });

    it("Should fail as activation-token is expired", async () => {
        const {jsonRes: createResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: activationToken} = createResponse,
            mockResponse = new MockResponse(),
            activateResponse = await userController.activate(activationToken, mockResponse, 0);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.NOT_FOUND, "should send http-status 404");
        assert.isDefined(activateResponse, "must return json as response");
        assert.isFalse(activateResponse.success, `must fail as activation-token is expired`);
        assert.isString(activateResponse.error, "error message must be returned");
        return assert.match(String(activateResponse.error), /Tokens are only valid for \d+ hours/i,
            "correct error message must be returned");
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Requesting new activation-token", () => {
    it("Should fail as mail-address is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.requestActivationToken({
                mail: ""
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid mail-address/i,
            "correct error message must be returned");
    });

    it("Should fail as mail-address is not in use", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.requestActivationToken({
                mail: "aaa@bbb.cc"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is not in use");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Mail-address is not in use/i,
            "correct error message must be returned");
    });

    it("Should fail as user-account is already activated", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.requestActivationToken({
                mail: "bestof1950@domain.tld"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as user-account is already activated");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Account must be activated already/i,
            "correct error message must be returned");
    });

    it("Should successfully return new activation-token", async () => {
        const {jsonRes: createResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: oldActivationToken} = createResponse,
            mockResponse = new MockResponse(),
            jsonResponse = await userController.requestActivationToken({
                mail: validMail
            }, mockResponse),
            {testExclusive: newActivationToken} = jsonResponse;

        assert.strictEqual(mockResponse.statusCode,
                        HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, "requesting activation token must succeed");
        assert.isUndefined(jsonResponse.error, "error message must be undefined");
        assert.isString(newActivationToken, "new activation-token must be a string");
        assert.notStrictEqual(oldActivationToken, newActivationToken,
            "former and new activation-tokens must differ!");
        return await userController.delete(validMail);
    });

    it("Should fail as newly requested activation-token must invalidate all previous activation-tokens of user",
    async () => {
        const {jsonRes: createResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: oldActivationToken} = createResponse,
            tokenMockResponse = new MockResponse(),
            activationMockResponse = new MockResponse(),
            tokenJsonResponse = await userController.requestActivationToken({
                mail: validMail
            }, tokenMockResponse),
            activateResponse = await userController.activate(oldActivationToken, activationMockResponse);

        assert.isTrue(tokenJsonResponse.success, "requesting new activation-token should succeed");
        assert.strictEqual(activationMockResponse.statusCode,
                            HTTP_STATUS_CODE.NOT_FOUND, "should send http-status 404");
        assert.isDefined(activateResponse, "must return json as response");
        assert.isFalse(activateResponse.success, `must fail as old token should have been invalidated`);
        assert.isString(activateResponse.error, "error message must be returned");
        return assert.match(String(activateResponse.error), /Tokens are only valid for \d+ hours/i,
            "correct error message must be returned");
    });

    it("Should be able to successfully activate account with new token", async () => {
        const tokenMockResponse = new MockResponse(),
            activationMockResponse = new MockResponse();
        let tokenJsonResponse: JSONResponse,
            activationToken,
            activationJsonResponse;

        await createTestAccount();
        tokenJsonResponse = await userController.requestActivationToken({
            mail: validMail
        }, tokenMockResponse);
        assert.isTrue(tokenJsonResponse.success, "requesting new activation-token should succeed");
        activationToken = tokenJsonResponse.testExclusive;
        activationJsonResponse = await userController.activate(<string> activationToken, activationMockResponse);
        return assert.isTrue(activationJsonResponse.success, "activation must have succeeded");
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Logging into user account", () => {
    it("Should fail as mail-address is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.login({
                mail: "",
                password: validMail
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid login credentials/i,
            "correct error message must be returned");
    });

    it("Should fail as password is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.login({
                mail: validMail,
                password: ""
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid login credentials/i,
            "correct error message must be returned");
    });

    it("Should fail as login credentials are unknown", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.login({
                mail: "aaa@bbb.ccc",
                password: "p4ssw0rd"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as login credentials are unknown");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid login credentials/i,
            "correct error message must be returned");
    });

    it("Should fail as account is banned", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.login({
                mail: "prankster@domain.tld",
                password: "bugmenot"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as account is banned");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Account has been disabled/i,
            "correct error message must be returned");
    });

    it("Should fail as account is not activated", async () => {
        const mockResponse = new MockResponse();
        let jsonResponse;

        await createTestAccount();
        jsonResponse =  await userController.login({
            mail: validMail,
            password: validPw
        }, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as account is not activated");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Account is not activated/i,
            "correct error message must be returned");
    });

    it("Should successfully login", async () => {
        const mockResponse = new MockResponse(),
            jwtClient = JWT.getInstance(),
            jsonResponse = await userController.login({
                mail: "bestof1950@domain.tld",
                password: "password"
            }, mockResponse);
        let authorizationHeader,
            jwt: string,
            user;

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, "request must have succeeded");
        assert.isUndefined(jsonResponse.error, "error message must not be returned");
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
    it("Should fail as mail-address is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.forgotPw({
                mail: ""
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid mail-address/i,
            "correct error message must be returned");
    });

    it("Should fail as mail-address is unknown", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.forgotPw({
                mail: "aaa@bbb.cc"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as mail-address is unknown");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Mail-address is not in use/i,
            "correct error message must be returned");
    });

    it("Should successfully return password-reset-token", async () => {
        const mockResponse = new MockResponse();
        let jsonResponse,
            pwResetToken: string;

        await createTestAccount();
        jsonResponse = await userController.forgotPw({
            mail: validMail
        }, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, "request must succeed");
        assert.isUndefined(jsonResponse.error, "error message must not be returned");
        pwResetToken = jsonResponse.testExclusive;
        assert.isDefined("Password-reset-token must be defined");
        assert.match(pwResetToken, uuidPattern, "password-reset-token must match UUID pattern");
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
    it("Should fail as password is empty", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {password: ""}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least \d+ characters/i,
            "correct error message must be returned");
    });

    it("Should fail as minimum password length is not reached", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {
                password: "a".repeat(minPwLength - 1)}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as minimum password length is not reached");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least \d+ characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains control characters", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {
                password: "\n" + validPw}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                        HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains control characters");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain control characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains leading whitespace", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {
                password: " " + validPw}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains leading whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains trailing whitespace", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {
                password: validPw + " "}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains trailing whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as password-reset-token has length 0", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("", {password: validPw}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password-reset token is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Invalid password-reset token/i,
            "correct error message must be returned");
    });

    it("Should fail as password-reset-token is unknown", async () => {
        const mockResponse = new MockResponse(),
            jsonResponse = await userController.reset("00000000-0000-0000-0000-000000000000",
                {password: validPw}, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password-reset token is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Tokens are only valid for \d+ hours/i,
            "correct error message must be returned");
    });

    it("Should reset password to new value", async () => {
        const {jsonRes: jsonResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: activationToken} = jsonResponse,
            activationMockResponse = new MockResponse(),
            loginMockResponse = new MockResponse(),
            loginMockResponse2 = new MockResponse(),
            loginMockResponse3 = new MockResponse(),
            forgotPwMockResponse = new MockResponse(),
            pwResetMockResponse = new MockResponse(),
            newPw = "N3W_P455W0RD";
        let activationJsonResponse,
            loginJsonResponse,
            loginJsonResponse2,
            loginJsonResponse3,
            forgotPwJsonResponse,
            pwResetJsonResponse,
            authorizationHeader: string,
            pwResetToken: string;

        activationJsonResponse = await userController.activate(activationToken, activationMockResponse);
        assert.isTrue(activationJsonResponse.success, "activation should be successful");
        loginJsonResponse = await userController.login({
            mail: validMail,
            password: validPw
        }, loginMockResponse);
        // Login should succeed, as credentials are unaltered
        assert.isTrue(loginJsonResponse.success, "login with original credentials should succeed");
        assert.strictEqual(loginMockResponse.statusCode,
                        HTTP_STATUS_CODE.OK, "login-response for original credentials should return 200");
        authorizationHeader = loginMockResponse.get(authHeaderName);
        assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
        forgotPwJsonResponse = await userController.forgotPw({mail: validMail}, forgotPwMockResponse);
        assert.isTrue(forgotPwJsonResponse.success, "should successfully return password-reset token");
        pwResetToken = forgotPwJsonResponse.testExclusive;
        // Set new password
        pwResetJsonResponse = await userController.reset(pwResetToken, {password: newPw}, pwResetMockResponse);
        assert.isTrue(pwResetJsonResponse.success, "password should be successfully changed");
        // Logging in with old credentials should fail
        loginJsonResponse2 = await userController.login({
            mail: validMail,
            password: validPw
        }, loginMockResponse2);
        assert.isFalse(loginJsonResponse2.success, "login with old credentials should fail");
        assert.strictEqual(loginMockResponse2.statusCode,
                        HTTP_STATUS_CODE.UNAUTHORIZED, "login-response for old credentials should return 401");
        // Logging in with new credentials should pass
        loginJsonResponse3 = await userController.login({
            mail: validMail,
            password: newPw
        }, loginMockResponse3);
        assert.isTrue(loginJsonResponse3.success, "login with new credentials should succeed");
        assert.strictEqual(loginMockResponse3.statusCode,
                        HTTP_STATUS_CODE.OK, "login-response for new credentials should return 200");
        authorizationHeader = loginMockResponse3.get(authHeaderName);
        return assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
    });

    it("Should fail as password-reset-token is expired", async () => {
        const forgotPwMockResponse = new MockResponse(),
            activationMockResponse = new MockResponse();
        let pwResetJsonResponse,
            pwResetToken,
            activationJsonResponse;

        await createTestAccount();
        pwResetJsonResponse = await userController.forgotPw({mail: validMail}, forgotPwMockResponse );
        assert.isTrue(pwResetJsonResponse.success, "should successfully return passwort-reset token");
        pwResetToken = pwResetJsonResponse.testExclusive;
        activationJsonResponse = await userController.reset(<string> pwResetToken, {
                password: "NEW_PASSWORD"
            }, activationMockResponse, 0);
        assert.isDefined(activationJsonResponse, "must return json as response");
        assert.isFalse(activationJsonResponse.success, "should fail as password-reset token is expired");
        assert.isString(activationJsonResponse.error, "error message must be returned");
        return assert.match(String(activationJsonResponse.error), /Tokens are only valid for \d+ hours/i,
            "correct error message must be returned");
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});

describe("Changing password", () => {
    it("Should fail as user is not logged in", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse(),
            jsonResponse = await userController.changePw(mockRequest, {
                password: "N3W_P455W0RD"
            }, mockResponse);

        assert.strictEqual(mockResponse.statusCode,
                HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail user is not logged in");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /You are not logged in/i,
            "correct error message must be returned");
    });

    it("Should fail as password is empty", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest, {password: ""}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password is empty");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least \d+ characters/i,
            "correct error message must be returned");
    });

    it("Should fail as minimum password length is not reached", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest,
                                                    {password: "a".repeat(minPwLength - 1)}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as minimum password length is not reached");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST contain at least \d+ characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains control characters", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest, {password: "\n" + validPw}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains control characters");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain control characters/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains leading whitespace", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest, {password: " " + validPw}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains leading whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as password contains trailing whitespace", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest, {password: validPw + " "}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                            HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains trailing whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Password MUST NOT contain leading or trailing whitespace/i,
            "correct error message must be returned");
    });

    it("Should fail as user-id is unknown", async () => {
        const mockRequest = new MockRequest(),
            mockResponse = new MockResponse(),
            newPw = "N3W_P455W0RD";
        let jsonResponse;

        (<any> mockRequest).user = {id: -1};
        jsonResponse = await userController.changePw(mockRequest, {password: newPw}, mockResponse);
        assert.strictEqual(mockResponse.statusCode,
                              HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY, "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as password contains trailing whitespace");
        assert.isString(jsonResponse.error, "error message must be returned");
        return assert.match(String(jsonResponse.error), /Unknown user/i,
             "correct error message must be returned");
    });

    it("Should change password to new value", async () => {
        const {jsonRes: jsonResponse}: {jsonRes: JSONResponse} = await createTestAccount(),
            {testExclusive: activationToken} = jsonResponse,
            jwtClient: JWT = JWT.getInstance(),
            activationMockResponse = new MockResponse(),
            loginMockResponse = new MockResponse(),
            loginMockResponse2 = new MockResponse(),
            loginMockResponse3 = new MockResponse(),
            changeMockResponse = new MockResponse(),
            mockRequest = new MockRequest(),
            newPw = "N3W_P455W0RD";
        let activationJsonResponse,
            loginJsonResponse,
            loginJsonResponse2,
            loginJsonResponse3,
            changeJsonResponse,
            authorizationHeader: string,
            jwt: string,
            user;

        activationJsonResponse = await userController.activate(activationToken, activationMockResponse);
        assert.isTrue(activationJsonResponse.success, "activation should be successful");
        // Login should succeed, as credentials are unaltered
        loginJsonResponse = await userController.login({
            mail: validMail,
            password: validPw
        }, loginMockResponse);
        assert.isTrue(loginJsonResponse.success, "login with original credentials should succeed");
        assert.strictEqual(loginMockResponse.statusCode,
                            HTTP_STATUS_CODE.OK, "login-response for original credentials should return 200");
        authorizationHeader = loginMockResponse.get(authHeaderName);
        assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
        // Extract token from authorization-header
        jwt = (authHeaderValuePattern.exec(authorizationHeader) || [])[1];
        user = (await jwtClient.verify(jwt));
        // Change password
        mockRequest.user = user;
        changeJsonResponse = await userController.changePw(mockRequest, {
            password: newPw
        }, changeMockResponse);
        assert.isTrue(changeJsonResponse.success, "should successfully change password");
        assert.strictEqual(changeMockResponse.statusCode, HTTP_STATUS_CODE.OK, "should respond with 200");
        // Logging in with old credentials should fail
        loginJsonResponse2 = await userController.login({
            mail: validMail,
            password: validPw
        }, loginMockResponse2);
        assert.isFalse(loginJsonResponse2.success, "login with old credentials should fail");
        assert.strictEqual(loginMockResponse2.statusCode,
                            HTTP_STATUS_CODE.UNAUTHORIZED, "login-response for old credentials should return 401");
        // Logging in with new credentials should pass
        loginJsonResponse3 = await userController.login({
            mail: validMail,
            password: newPw
        }, loginMockResponse3);
        assert.isTrue(loginJsonResponse3.success, "login with new credentials should succeed");
        assert.strictEqual(loginMockResponse3.statusCode,
                            HTTP_STATUS_CODE.OK, "login-response for new credentials should return 200");
        authorizationHeader = loginMockResponse3.get(authHeaderName);
        return assert.match(authorizationHeader, authHeaderValuePattern,
            `Value of ${authHeaderName} header must start with 'Bearer ' followed by base64url-encoded string`);
    });

    // clean up after all test-cases --> remove created user-account from db
    afterEach(async () => {
        return await userController.delete(validMail);
    });
});
