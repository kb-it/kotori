"use strict";
import {assert} from "chai";
import {UserModel} from "../models/UserModel";

describe("Checking for user-record existence", () => {
    it("Should return false for unknown user", async () => {
        const unknownUserId = -1,
            isUserExistent = await UserModel.exists(unknownUserId);

        assert.isFalse(isUserExistent, "Unknown user must not exist");
    });

    it("Should return false for banned user", async () => {
        const bannedUserId = 4,
            isUserExistent = await UserModel.exists(bannedUserId);

        assert.isFalse(isUserExistent, "Banned user is considered as not existent");
    });

    it("Should return true for active user", async () => {
        const knownUserId = 1,
            isUserExistent = await UserModel.exists(knownUserId);

        assert.isTrue(isUserExistent, "Active user is considered as existent");
    });
});
