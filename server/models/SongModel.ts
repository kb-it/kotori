"use strict";
import {createHash} from "crypto";
import {Client, ClientConfig, QueryResult} from "pg";

type Fingerprint = number[];

type MetaDataRow = {
    // the queried fingerprint
    query_idx: number;
    // the matching fingerprint
    fingerprint: Fingerprint;
    fingerprint_id: number;
    // a score indicating how similar the given query fingerprint and fingerprint are
    // a number 0 <= score <= 1
    score: number,
    track_id: number;
    tag_type_name: string;
    tag_value: Buffer;
}

export interface MetaData {
    fingerprint: Fingerprint;
}
export interface TrackMetaData {
    trackId: number;
    score: number;
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

    // TODO: remove testMode! thats ugly
    public constructor(testMode?: boolean) {
        if (testMode) {
            this.clientConfig.database += "_test";
        }
        this.client = new Client(this.clientConfig);
        this.client.connect();
    }

    /**
     * Returns meta-data of specific tracks by its fingerprint
     * @param {number[][]} fingerprints Query tracks matching those given fingerprints
     * @returns {MetaDataRow[]} Table-rows consisting of track-meta-data as returned from DBS
     * 
     */
    private async requestMetaData(fingerprints: number[][]): Promise<MetaDataRow[]> {
        let sql: string = `SELECT DISTINCT ON (track.id, tag_type.id)
                last_value(track.id) OVER (
                    PARTITION BY
                        track.id,
                        tag_type.id
                    ORDER BY tag.revision DESC
                ) AS track_id,
                tag_type.name AS tag_type_name,
                tag.value AS tag_value,
                fps.column1 AS query_idx, matches.hash AS fingerprint, matches.id AS fingerprint_id, matches.score 
                FROM (
                    VALUES ${ Array(fingerprints.length).fill(0).map((e: number, i: number) => "(" + i + ", $" + (i+1) + ")").join(",") }
                ) fps JOIN LATERAL (
                    SELECT fingerprint.id,
                           fingerprint.hash,
                           echoprint_compare(fps.column2::int[], fingerprint.hash::int[]) AS score
                    FROM fingerprint
                    ORDER BY score DESC
                    LIMIT 15
                ) matches ON matches.score>0
                INNER JOIN track ON track.id_fingerprint = matches.id
                INNER JOIN tag ON tag.id_track = track.id
                INNER JOIN tag_type ON tag.id_tag_type = tag_type.id
            `,
            results: QueryResult = await this.client.query(sql, fingerprints),
            rows: MetaDataRow[] = results.rows;
        return rows;
    }

    /**
     * Requests all meta-data values of several tracks, specified by its fingerprint
     * @param {number[][]} fingerprints Fingerprints of tracks
     * @returns {FingerprintResult[]} Meta-data values mapped of tracks, grouped by related fingerprints
     */
    public async queryAll(fingerprints: number[][]): Promise<FingerprintResult[]> {
        const metaDataRows: MetaDataRow[] = await this.requestMetaData(fingerprints);

        let results = fingerprints.map((fp) => {return {fingerprint: fp, results: []} as FingerprintResult});
        for (let row of metaDataRows) {
            let result = results[row.query_idx].results;
            let lastResult = result[result.length - 1];
            if (!lastResult || lastResult.trackId != row.track_id) {
                lastResult = {trackId: row.track_id, score: row.score} as TrackMetaData;
                result.push(lastResult);
            }
            (<any>lastResult)[row.tag_type_name] = Utils.encodeTagValue(row.tag_value);
        }
        return results;
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
     * Converts value of a tag, represented by a Buffer, to an UTF8 string
     * @param {Buffer} tagValueBuffer Value of a tag as Buffer
     * @returns {string} UTF8-encoded tag value 
     */
    public static encodeTagValue(tagValueBuffer: Buffer): string {
        const tagValue: string = Buffer.from(tagValueBuffer).toString("utf-8");

        return tagValue;
    }
}
