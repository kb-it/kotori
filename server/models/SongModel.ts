"use strict";
import {createHash} from "crypto";
import {Client, ClientConfig, QueryResult} from "pg";

type Fingerprint = number[];

type MetaDataRow = {
    fingerprint: Fingerprint[]; // TBD: Examine why fingerprints are wrapped in array!?!
    fingerprint_id: number;
    track_id: number;
    tag_type_name: string;
    tag_value: Buffer;
}

type FingerprintIdMap = {
    [fingerprintId: string]: {
        fingerprint: Fingerprint;
        results: {
            [trackId: string]: {
                [meta: string]: any
            }
        }
    };
}

export interface MetaData {
    fingerprint: Fingerprint;
}

export interface TrackMetaData {
    trackId: number;
}

export type FingerprintResult = {
    fingerprint: Fingerprint;
    results: TrackMetaData[];
}

export class SongModel {
    private clientConfig: ClientConfig = {
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        database: "kotori",
        password: process.env.POSTGRES_PASSWORD,
        port: parseInt(String(process.env.POSTGRES_PORT), 10)
    };
    private client: Client;

    public constructor(testMode?: boolean) {
        if (testMode) {
            this.clientConfig.database += "_test";
        }
        this.client = new Client(this.clientConfig);
        this.client.connect();
    }

    /**
     * Returns meta-data of specific tracks by its fingerprint
     * @param {number[][]} fingerprints Fingerprints of specific tracks
     * @returns {MetaDataRow[]} Table-rows consisting of track-meta-data as returned from DBS
     */
    private async requestMetaData(fingerprints: number[][]): Promise<MetaDataRow[]> {
        let sql: string = `
                SELECT DISTINCT ON (track.id, tag_type.id)
                    last_value(track.id) OVER (
                        PARTITION BY
                            track.id,
                            tag_type.id
                        ORDER BY tag.revision DESC
                    ) AS track_id,
                    fingerprint.id AS fingerprint_id,
                    fingerprint.hash AS fingerprint,
                    tag_type.name AS tag_type_name,
                    tag.value AS tag_value
                FROM fingerprint
                INNER JOIN track
                    ON track.id_fingerprint = fingerprint.id
                INNER JOIN tag
                    ON tag.id_track = track.id
                INNER JOIN tag_type
                    ON tag.id_tag_type = tag_type.id
                WHERE
                    ${
                        fingerprints.map((fp) => {
                            return Utils.fingerprintToSql(fp);
                        }).join(" OR ")
                    }
            `,
            results: QueryResult = await this.client.query(sql),
            rows: MetaDataRow[] = results.rows;
    
        console.info("TBD: SongModel.requestMetaData :: Use parameterized query, for safe sql-injection prevention!!!");
        return rows;
    }
    
    /**
     * Creates objects consisting of meta-data of specific tracks and maps them to their related fingerprints
     * @param {MetaDataRow[]} rows Table-rows consisting of track-meta-data as returned from DBS
     * @returns {FingerprintIdMap} Object having ids of fingerprints as specified in DB as keys and Objects as values,
     *      which consist of the connected fingerprint, and related track-meta-data
     */
    private mapTracksToFingerprintIds(rows: MetaDataRow[]): FingerprintIdMap {
        const trackMap: FingerprintIdMap = rows.reduce((trackMap: FingerprintIdMap, row: MetaDataRow) => {
            const fingerprintId: string = String(row.fingerprint_id),
                fingerprint: number[] = row.fingerprint[0],
                trackId: string =  String(row.track_id),
                tagName: string = row.tag_type_name,
                tagValue: string = Utils.encodeTagValue(row.tag_value);
            let track: {
                    fingerprint: number[],
                    results: {
                        [meta: string]: any
                    }
                } = trackMap[fingerprintId],
                trackResult: {
                    [trackId: string]: any
                };

            if (!track) {
                track = {
                    fingerprint: fingerprint,
                    results: {}
                };
                trackMap[fingerprintId] = track;
            }
            trackResult = track.results[trackId];
            if (!trackResult) {
                trackResult = {trackId: trackId};
                track.results[trackId] = trackResult;
            }
            trackResult[tagName] = tagValue;

            return trackMap;
        }, {});

        return trackMap;
    }

    /**
     * Converts an instance of FingerprintIdMap into format of FingerprintResult[]
     * @param {FingerprintIdMap} fingerprintMap
     * @returns {FingerprintResult[]}
     */
    private formatFingerprintResults(fingerprintMap: FingerprintIdMap): FingerprintResult[] {
        const fingerprintResults: FingerprintResult[] = Object.getOwnPropertyNames(fingerprintMap).map(
            (fingerprintId: string) => {
            const track = fingerprintMap[fingerprintId],
                trackResults = Object.getOwnPropertyNames(track.results).map((trackId: string) => {
                    // create shallow clone of result-object for ensuring immutability of origin
                    const trackResult = Utils.createShallowClone(track.results[trackId]);

                    return trackResult;
                }),
                fingerprintResult: FingerprintResult = {
                    // create shallow clone of fingerprint-array for ensuring immutability of origin
                    fingerprint: <number[]> Utils.createShallowClone(track.fingerprint),
                    results: <TrackMetaData[]> trackResults
                };

            return fingerprintResult;
        });

        return fingerprintResults;
    }

    private mapTagRowsToFingerprints(rows: MetaDataRow[]): FingerprintResult[] {
        const fingerprintIdMap: FingerprintIdMap = this.mapTracksToFingerprintIds(rows),
            fingerprintResults: FingerprintResult[] = this.formatFingerprintResults(fingerprintIdMap);

        return fingerprintResults;
    }

    /**
     * Requests all meta-data values of several tracks, specified by its fingerprint
     * @param {number[][]} fingerprints Fingerprints of tracks
     * @returns {FingerprintResult[]} Meta-data values mapped of tracks, grouped by related fingerprints
     */
    public async queryAll(fingerprints: number[][]): Promise<FingerprintResult[]> {
        const metaDataRows: MetaDataRow[] = await this.requestMetaData(fingerprints),
            fingerprintResults: FingerprintResult[] = this.mapTagRowsToFingerprints(metaDataRows);

        return fingerprintResults;
    }
}

class Utils {
    /**
     * Creates a shallow clone of a passed object instance 
     * @param {Object|Array<T>} origin Object/array instance to be cloned
     * @returns {Object|Array<T>} Shallow clone of passed object/array  
     */
    public static createShallowClone<T>(origin: T): Object | Array<T> {
        let shallowClone: T;

        if (Array.isArray(origin)) {
            shallowClone = Object.assign([], origin);
        } else if (typeof origin === "object") {
            shallowClone = Object.assign({}, origin);
        } else {
            throw TypeError("Only objects can be cloned, but passed value is neither an Array nor an Object!");
        }

        return shallowClone;
    }

    /**
     * Converts a fingerprint to its sql-compliant representation
     * @param {number[]} fingerprint Fingerprint of a track
     * @returns {string} SQL-representation of a fingerprint  
     */
    public static fingerprintToSql(fingerprint: number[]): string {
        /**
         * Could be vulnerable to sql-injection, but as a fingerprint is of type number[],
         * only number-values could be injected.
         * Risk of being able to inject malicious code must be estimated.
         * For safety reasons parameterized queries should be used!
         */
        
        return [
            "hash",
            "'{{" + fingerprint.join(",") + "}}'"
        ].join(" = ");
    }

    /**
     * Converts value of a tag, represented by a Buffer, to an UTF8 string
     * @param {Buffer} tagValueBuffer Value of a tag as Buffer
     * @returns {string} UTF8-encoded tag value 
     */
    public static encodeTagValue(tagValueBuffer: Buffer): string {
        const tagValue: string = Buffer.from(tagValueBuffer).toString("utf-8");

        return tagValue;
    }
}
