import {assert} from "chai";
import {SongController} from "../controllers/SongController";
import {MetaData, FingerprintResult} from "../models/SongModel";

describe("Query functionality", () => {
    const songController = new SongController();

    it("Should always return passed fingerprint", async () => {
        const fingerprint = [-1],
            queryDataList: MetaData[] = [{
                fingerprint: fingerprint
            }],
            results = await songController.queryAll(queryDataList);

            assert.isArray(results, "results should be of type array");
            assert.lengthOf(results, 1, "results-array should only contain one result");
            assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
            assert.deepEqual(results[0].fingerprint, fingerprint, "fingerprint of only result should equal passed fingerprint");
            assert.property(results[0], "tracks", "only result should have property named 'tracks'");
            assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
            assert.isEmpty(results[0].tracks, "array-property 'tracks' of only result should be empty");
        });

    it("Should return data of single track for single fingerprint", async () => {
        const fingerprint = [2,2],
            queryDataList: MetaData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = [
                {
                    trackId: "5",
                    track: "1",
                    artist: "Jan & Kjeld",
                    title: "Banjo Boy",
                    album: "Banjo Boy",
                    composer: "Charly Niessen",
                    score: 1
                }
            ],
            results = await songController.queryAll(queryDataList);

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, 1, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint, "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        // fingerprint [2,2] has relations to only a single track in db
        assert.lengthOf(results[0].tracks, 1, "array-property 'tracks' of only result should contain one track");
        // check if returned track-values contain all expected meta-data
        assert.deepEqual(results[0].tracks, expectedTrackData, "only matching track should contain all expected metadata");
    });
        
    it("Should return data of several tracks for single fingerprint", async () => {
        const fingerprint = [0,0,0,0], 
            queryDataList: MetaData[] = [{
                fingerprint: fingerprint
            }],
            expectedTrackData = [
                {
                    trackId: "1",
                    track: "1",
                    artist: "Die Schöneberger Sängerknaben",
                    title: "Die Fischerin vom Bodensee",
                    album: "Das waren Schlager 1950",
                    composer: "Franz Winkler",
                    score: 1
                },
                {
                    trackId: "2",
                    track: "20",
                    artist: "Die Schöneberger Sängerknaben",
                    title: "Die Fischerin vom Bodensee",
                    album: "Die Goldene Schlagerbox der 50er Jahre",
                    composer: "Franz Winkler",
                    score: 1
                }
            ],
            results = await songController.queryAll(queryDataList);

        assert.isArray(results, "results should be of type array");
        assert.lengthOf(results, 1, "results-array should only contain one result");
        assert.property(results[0], "fingerprint", "only result should have property named 'fingerprint'");
        assert.deepEqual(results[0].fingerprint, fingerprint, "fingerprint of only result should equal passed fingerprint");
        assert.property(results[0], "tracks", "only result should have property named 'tracks'");
        assert.isArray(results[0].tracks, "property 'tracks' of only result should be of type array");
        // fingerprint [0,0,0,0] has relations to two tracks in db
        assert.lengthOf(results[0].tracks, 2, "array-property 'tracks' of only result should contain two tracks");
        // check if returned track-values contain all expected meta-data
        assert.deepEqual(results[0].tracks, expectedTrackData, "two matching tracks should contain all expected metadata");
    });

    it("Should return data of several tracks for several fingerprints", async () => {
        const fingerprintA = [1,1,1],
            fingerprintB = [3],
            queryDataList = [
                {
                    fingerprint: fingerprintA
                },
                {
                    fingerprint: fingerprintB
                }
            ],
            expectedResult = [
                {
                    fingerprint: fingerprintA,
                    tracks: [
                        {
                            trackId: "3",
                            track: "2",
                            artist: "Zarah Leander",
                            title: "Wenn der Herrgott will",
                            album: "Unvergessene Zarah Leander",
                            composer: "Michael Jary",
                            score: 1
                        },
                        {
                            trackId: "4",
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
                            trackId: "6",
                            track: "2",
                            artist: "Heidi Brühl",
                            title: "Wir wollen niemals auseinandergehn",
                            album: "Schlagerjuwelen - Ihre großen Erfolge",
                            composer: "Michael Jary",
                            score: 1
                        }
                    ]
                }
            ],
            results = await songController.queryAll(queryDataList);

        assert.deepEqual(results, expectedResult, "results should equal expected results");
    });
});

