"use strict";
import {assert} from "chai";
import {SongController, QueryData} from "../controllers/SongController";
import {Fingerprint, QueryResponse, UpdateTrackData, InsertTrackData} from "../models/SongModel";
import {JWTUserData} from "../auth/JWTSingleton";
import * as HTTP_STATUS_CODE from "http-status-codes";

const MockRequest = require("mock-express-request"),
    MockResponse = require("mock-express-response"),
    songController = new SongController(),
    bannedUserId = 4;

describe("Query functionality", () => {
    it("Should always return passed fingerprint", async () => {
        const fingerprint: Fingerprint = [-1],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            results = await songController.queryAll(queryDataList),
            expectedFpCount = 1;

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, expectedFpCount, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint,
            "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        return assert.isEmpty(results[0].tracks, "array-property 'tracks' of only result should be empty");
    });

    it("Should return data of single track for single fingerprint", async () => {
        // fingerprints shall not be mistaken for magic numbers by tslint
        // tslint:disable-next-line:no-magic-numbers
        const fingerprint: Fingerprint = [2, 2],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = [
                {
                    trackId: 5,
                    track: "1",
                    artist: "Jan & Kjeld",
                    title: "Banjo Boy",
                    album: "Banjo Boy",
                    composer: "Charly Niessen",
                    score: 1
                }
            ],
            results = await songController.queryAll(queryDataList),
            expectedFpCount = 1;

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, expectedFpCount, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint,
            "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        // fingerprint [2,2] has relations to only a single track in db
        assert.lengthOf(results[0].tracks, 1, "array-property 'tracks' of only result should contain one track");
        // check if returned track-values contain all expected meta-data
        return assert.deepEqual(results[0].tracks, expectedTrackData,
            "only matching track should contain all expected metadata");
    });

    it("Should return data of several tracks for single fingerprint", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = [
                {
                    trackId: 1,
                    track: "1",
                    artist: "Die Schöneberger Sängerknaben",
                    title: "Die Fischerin vom Bodensee",
                    album: "Das waren Schlager 1950",
                    composer: "Franz Winkler",
                    score: 1
                },
                {
                    trackId: 2,
                    track: "20",
                    artist: "Die Schöneberger Sängerknaben",
                    title: "Die Fischerin vom Bodensee",
                    album: "Die Goldene Schlagerbox der 50er Jahre",
                    composer: "Franz Winkler",
                    score: 1
                }
            ],
            results = await songController.queryAll(queryDataList),
            expectedFpCount = 1,
            expectedTrackCount = 2;

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, expectedFpCount, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint,
            "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        // fingerprint [0,0,0,0] has relations to two tracks in db
        assert.lengthOf(results[0].tracks, expectedTrackCount,
            "array-property 'tracks' of only result should contain two tracks");
        // check if returned track-values contain all expected meta-data
        return assert.deepEqual(results[0].tracks, expectedTrackData,
            "two matching tracks should contain all expected metadata");
    });

    it("Should return several track scores above 0 and below 1 for imprecise fingerprint", async () => {
        const fingerprint: Fingerprint = [1, 0, 1],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            results = await songController.queryAll(queryDataList),
            expectedFpCount = 1,
            expectedTrackCount = 2;

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, expectedFpCount, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint,
            "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        // fingerprint [1,1,1] has relations to two tracks in db
        assert.lengthOf(results[0].tracks, expectedTrackCount,
            "array-property 'tracks' of only result should contain two tracks");
        assert.isAbove(results[0].tracks[0].score, 0, "score of first track should be above 0");
        assert.isBelow(results[0].tracks[0].score, 1, "score of first track should be below 1");
        assert.isAbove(results[0].tracks[1].score, 0, "score of second track should be above 0");
        return assert.isBelow(results[0].tracks[1].score, 1, "score of second track should be below 1");
    });

    it("Should return data of several tracks for several fingerprints", async () => {
        const fingerprintA: Fingerprint = [1, 1, 1],
            // fingerprints shall not be mistaken for magic numbers by tslint
            // tslint:disable-next-line:no-magic-numbers
            fingerprintB: Fingerprint = [2, 2],
            queryDataList: QueryData[] = [
                {
                    fingerprint: fingerprintA
                },
                {
                    fingerprint: fingerprintB
                }
            ],
            expectedResult: QueryResponse[] = [
                {
                    fingerprint: fingerprintA,
                    tracks: [
                        {
                            trackId: 3,
                            track: "2",
                            artist: "Zarah Leander",
                            title: "Wenn der Herrgott will",
                            album: "Unvergessene Zarah Leander",
                            composer: "Michael Jary",
                            score: 1
                        },
                        {
                            trackId: 4,
                            track: "12",
                            artist: "Zarah Leander",
                            title: "Wenn der Herrgott will",
                            album: "Das waren Schlager 1950",
                            composer: "Michael Jary",
                            score: 1
                        }
                    ]
                },
                {
                    fingerprint: fingerprintB,
                    tracks: [
                        {
                            trackId: 5,
                            track: "1",
                            artist: "Jan & Kjeld",
                            title: "Banjo Boy",
                            album: "Banjo Boy",
                            composer: "Charly Niessen",
                            score: 1
                        }
                    ]
                }
            ],
            results: QueryResponse[] = await songController.queryAll(queryDataList);

        return assert.deepEqual(results, expectedResult, "results should equal expected results");
    });
});

describe("Update functionality", () => {
    const mockUserData: JWTUserData = {id: 5};

    it("Should throw as user is not logged in", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            trackData = await songController.queryAll(queryDataList),
            updateDataList: UpdateTrackData[] = [
                {
                    trackId: 1,
                    tags: {
                        artist: "foo"
                    }
                },
                {
                    trackId: -1,
                    tags: {
                        artist: "bar"
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);

        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as user is not logged in");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Not logged in/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(trackData, updatedTrackData,
            "track data should be unaltered as complete update should have failed");
    });

    it("Should throw for banned/not existent user", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                    fingerprint: fingerprint
            }],
            trackData = await songController.queryAll(queryDataList),
            updateDataList: UpdateTrackData[] = [{
                trackId: 1,
                tags: {
                    artist: "foo"
                }
            }],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any>mockRequest).user = {id: bannedUserId};
        jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as account is banned");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Account has been disabled/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(trackData, updatedTrackData,
            "track data should be unaltered as update should have failed in total");
    });

    it("Should throw when being used with unknown track-ids", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            trackData = await songController.queryAll(queryDataList),
            updateDataList: UpdateTrackData[] = [
                {
                    trackId: 1,
                    tags: {
                        artist: "foo"
                    }
                },
                {
                    trackId: -1,
                    tags: {
                        artist: "bar"
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any> mockRequest).user = mockUserData;
        jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
            "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as unknown track-ids have been submitted");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Unknown trackId/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(trackData, updatedTrackData,
            "track data should be unaltered as complete update should have failed");
    });

    it("Should throw when unknown tags are passed", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = await songController.queryAll(queryDataList),
            updateArtistName = "Foo",
            updateTitleName = "Bar",
            updateDataList: UpdateTrackData[] = [
                {
                    trackId: 1,
                    tags: {
                        artist: updateArtistName,
                        foo: "bar",
                        title: updateTitleName
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any> mockRequest).user = mockUserData;
        jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY,
            "should send http-status 422");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as unknown tags have been submitted");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Unknown tag/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(updatedTrackData, expectedTrackData,
            "tags should not have been altered");
    });

    it("Should update tags of specified track", async () => {
        const fingerprint: Fingerprint = [1, 1, 1],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = await songController.queryAll(queryDataList),
            updateArtistName = "Baz",
            updateTitleName = "Bat",
            updateDataList: UpdateTrackData[] = [
                {
                    trackId: 3,
                    tags: {
                        artist: updateArtistName,
                        title: updateTitleName
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any> mockRequest).user = mockUserData;
        jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, "request must have succeeded");
        assert.isUndefined(jsonResponse.error, "error message must not be returned");
        updatedTrackData = await songController.queryAll(queryDataList);

        // Set expected values of track metadata after update
        expectedTrackData[0].tracks[0].artist = updateArtistName;
        expectedTrackData[0].tracks[0].title = updateTitleName;
        return assert.deepEqual(updatedTrackData, expectedTrackData,
            "received meta data should contain all updated tag values");
    });

    it("Should update tags of specified tracks", async () => {
        const fingerprintA: Fingerprint = [0, 0, 0, 0],
            fingerprintB: Fingerprint = [1, 1, 1],
            queryDataList: QueryData[] = [
                {
                    fingerprint: fingerprintA
                },
                {
                    fingerprint: fingerprintB
                }
            ],
            expectedTrackData = await songController.queryAll(queryDataList),
            updateArtistNameA = "A",
            updateTitleNameA = "B",
            updateArtistNameB = "C",
            updateTitleNameB = "D",
            updateDataList: UpdateTrackData[] = [
                {
                    trackId: 1,
                    tags: {
                        artist: updateArtistNameA,
                        title: updateTitleNameA
                    }
                },
                {
                    trackId: 3,
                    tags: {
                        artist: updateArtistNameB,
                        title: updateTitleNameB
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any> mockRequest).user = mockUserData;
        jsonResponse = await songController.updateAll(mockRequest, updateDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.OK, "should send http-status 200");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isTrue(jsonResponse.success, "request must have succeeded");
        assert.isUndefined(jsonResponse.error, "error message must not be returned");
        updatedTrackData = await songController.queryAll(queryDataList);

        // Set expected values of track metadata after update
        expectedTrackData[0].tracks[0].artist = updateArtistNameA;
        expectedTrackData[0].tracks[0].title = updateTitleNameA;
        expectedTrackData[1].tracks[0].artist = updateArtistNameB;
        expectedTrackData[1].tracks[0].title = updateTitleNameB;
        return assert.deepEqual(updatedTrackData, expectedTrackData,
            "received meta data should contain all updated tag values");
    });

    // clean up after all test-cases --> reset values of test-db to original state
    after(async () => {
        const updateDataList: UpdateTrackData[] = [
                {
                    trackId: 1,
                    tags: {
                        artist: "Die Schöneberger Sängerknaben",
                        title: "Die Fischerin vom Bodensee"
                    }
                },
                {
                    trackId: 3,
                    tags: {
                        artist: "Zarah Leander",
                        title: "Wenn der Herrgott will"
                    }
                }
            ],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();

        (<any> mockRequest).user = mockUserData;
        return await songController.updateAll(mockRequest, updateDataList, mockResponse);
    });
});

describe("Insert functionality", () => {
    const mockUserData: JWTUserData = {id: 5};
    let mockRequest = new MockRequest();

    mockRequest.user = mockUserData;

    it("Should throw as user is not logged in", async () => {
        const fingerprintA: Fingerprint = [0, 0, 0, 0],
            fingerprintB: Fingerprint = [1, 1, 1],
            queryDataList: QueryData[] = [{
                fingerprint: fingerprintA
            },
            {
                fingerprint: fingerprintB
            }],
            trackData = await songController.queryAll(queryDataList),
            insertDataList: InsertTrackData[] = [
                {
                    fingerprint: fingerprintA,
                    tags: {
                        artist: "foo"
                    }
                },
                {
                    fingerprint: fingerprintB,
                    tags: {
                        artist: "bar"
                    }
                }
            ],
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        jsonResponse = await songController.insertAll(new MockRequest(), insertDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as user is not logged in");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Not logged in/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(trackData, updatedTrackData,
            "track data should be unaltered as insert should have failed in total");
    });

    it("Should throw for banned/not existent user", async () => {
        const fingerprint: Fingerprint = [0, 0, 0, 0],
            queryDataList: QueryData[] = [{
                    fingerprint: fingerprint
            }],
            trackData = await songController.queryAll(queryDataList),
            insertDataList: InsertTrackData[] = [{
                fingerprint: fingerprint,
                tags: {
                    artist: "foo"
                }
            }],
            mockRequest = new MockRequest(),
            mockResponse = new MockResponse();
        let updatedTrackData: QueryResponse[],
            jsonResponse;

        (<any> mockRequest).user = {id: bannedUserId};
        jsonResponse = await songController.insertAll(mockRequest, insertDataList, mockResponse);
        assert.strictEqual(mockResponse.statusCode, HTTP_STATUS_CODE.UNAUTHORIZED, "should send http-status 401");
        assert.isDefined(jsonResponse, "must return json as response");
        assert.isFalse(jsonResponse.success, "must fail as account is banned");
        assert.isString(jsonResponse.error, "error message must be returned");
        assert.match(String(jsonResponse.error), /Account has been disabled/i,
            "correct error message must be returned");
        updatedTrackData = await songController.queryAll(queryDataList);
        return assert.deepEqual(trackData, updatedTrackData,
            "track data should be unaltered as insert should have failed in total");
    });

    it("Should create new tag for passed fingerprint", async () => {

    });

    it("Should create new record for passed fingerprint if none exists yet", () => {

    });
});
