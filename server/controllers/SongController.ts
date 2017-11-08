"use strict";
import {Request, Response} from "express";
import {JsonController, Req, Res, Body, Get, Post, Put, UseBefore} from "routing-controllers";
import * as HTTP_STATUS_CODE from "http-status-codes";
import {JWTAuthentication} from "../middleware/JWTAuthentication";
import {JWTUserData} from "../auth/JWTSingleton";
import {Fingerprint, SongModel, UpdateTrackData, QueryResponse, InsertTrackData} from "../models/SongModel";
import {UserModel} from "../models/UserModel";
import {JSONResponse} from "../types/JSONResponse";

const apiVersion = "v1";

export type QueryData = {
    fingerprint: Fingerprint;
};

@JsonController()
export class SongController {
    /**
     * @description Executes a function only if user is logged in exists.
     * If user is not logged in an Error will be thrown.
     * @param {Request} request
     * @param {Function} successFn
     */
    private async callIfUserIsLoggedIn(request: Request, successFn: Function) {
        if ((<any> request).user) {
            const {user: userData}: {user: JWTUserData} = (<any> request);

            if (typeof successFn === "function") {
                await successFn(userData);
            }
        } else {
            throw Error("Not logged in.");
        }
    }

    /**
     * @description Executes a function only if active user, determined by its user-id, exists.
     * If user does not exist an Error will be thrown.
     * @param {number} userId Id of an user, whose status will be verified
     * @param {Function} successFn Function to be called if active user exists
     */
    private async callIfUserExists(userId: number, successFn: Function) {
        const isUserExistent = await UserModel.exists(userId);

        if (isUserExistent) {
            if (typeof successFn === "function") {
                await successFn();
            }
        } else {
            throw new Error("Account has been disabled.");
        }
    }

    /**
     * Returns all available song information of several specific songs
     * @param {string[]} fingerprints Fingerprints of songs, whose meta information shall be returned
     * @returns {MetaData[]}
     */
    @Post(`/${apiVersion}/tracks/query`)
    async queryAll(@Body({required: true}) queryDataList: QueryData[]): Promise<QueryResponse[]> {
        const fingerprints = queryDataList.map(queryData => {
                return queryData.fingerprint;
            }),
            results: QueryResponse[] = await SongModel.queryAll(fingerprints);

        return results;
    }

    /**
     * Updates stored track tag-values in db with passed values
     * @param {Request} request Current request made for triggering update
     * @param {UpdateTrackData[]} updateDataList Tag-values mapped to its related track-ids
     * @param {Response} reponse Response for current request
     * @returns {Promise<JSONResponse>} Contains success value and, in case an error occurred, an error-message
     */
    @Put(`/${apiVersion}/tracks`)
    @UseBefore(JWTAuthentication)
    async updateAll(@Req() request: Request,
                    @Body({required: true}) updateDataList: UpdateTrackData[],
                    @Res() response: Response): Promise<JSONResponse> {
        let jsonResponse: JSONResponse = {
            success: false}
        ;

        try {
            await this.callIfUserIsLoggedIn(request, async (userData: JWTUserData) => {
                await this.callIfUserExists(userData.id, async () => {
                    try {
                        await SongModel.updateAll(userData, updateDataList);
                        jsonResponse.success = true;
                    } catch (e) {
                        // Only messages of custom errors, which are of type TypeError, should be exposed
                        jsonResponse.error = `Updating failed.${e instanceof TypeError ? " " + e.message : ""}`;
                        response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
                    }
                });
            });
        } catch (e) {
            jsonResponse.error = `Updating failed. ${e.message}`;
            response.status(HTTP_STATUS_CODE.UNAUTHORIZED);
        }

        return jsonResponse;
    }

    /**
     * Inserts new tags and related tracks in db.
     * If related fingerprints do not exist yet, fingerprint-records will be created as well.
     * @param {Request} request Current request made for triggering update
     * @param {InsertTrackData[]} insertDataList Tag-values mapped to its related fingerprints
     * @param {Response} reponse Response for current request
     * @returns {Promise<JSONResponse>} Contains success value and, in case an error occurred, an error-message
     */
    @Post(`/${apiVersion}/tracks`)
    @UseBefore(JWTAuthentication)
    async insertAll(@Req() request: Request,
                    @Body({required: true}) insertDataList: InsertTrackData[],
                    @Res() response: Response): Promise<JSONResponse> {
        let jsonResponse: JSONResponse = {
            success: false
        };

        try {
            await this.callIfUserIsLoggedIn(request, async (userData: JWTUserData) => {
                await this.callIfUserExists(userData.id, async () => {
                    try {
                        await SongModel.insertAll(userData, insertDataList);
                        jsonResponse.success = true;
                    } catch (e) {
                        // Only messages of custom errors, which are of type TypeError, should be exposed
                        jsonResponse.error = `Inserting failed.${e instanceof TypeError ? " " + e.message : ""}`;
                        response.status(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY);
                    }
                });
            });
        } catch (e) {
            jsonResponse.error = `Inserting failed. ${e.message}`;
            response.status(HTTP_STATUS_CODE.UNAUTHORIZED);
        }

        return jsonResponse;
    }

    /**
     * @description Returns all valid tag names
     * @returns {string[]} Valid tag names
     */
    @Get(`/${apiVersion}/tagnames`)
    async getTagNames(): Promise<string[]> {
        const tagNames = await SongModel.getTagNames();

        return tagNames;
    }
}
