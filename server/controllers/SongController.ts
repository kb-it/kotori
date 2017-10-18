"use strict";
import {JsonController, Body, Post} from "routing-controllers";
import {SongModel, MetaData, FingerprintResult} from "../models/SongModel";

const apiVersion = "v1";

@JsonController()
export class SongController {
    private model: SongModel;
    public constructor() {
        const testmodeEnabled = true;

        this.model = new SongModel(testmodeEnabled);
    }

    /**
     * Returns all available song information of several specific songs
     * @param {string[]} fingerprints Fingerprints of songs, whose meta information shall be returned
     * @returns {MetaData[]}
     */
    @Post(`/${apiVersion}/tracks/query`)
    async queryAll(@Body({required: true}) queryDataList: MetaData[]): Promise<FingerprintResult[]> {
        const fingerprints = queryDataList.map(queryData => {
                return queryData.fingerprint;
            }),
            response: FingerprintResult[] = await this.model.queryAll(fingerprints);

        return response;
    }
}
