"use strict";
import {AppConfig} from "../config/AppConfig";
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
    track_id: string;
    tag_type_name: string;
    tag_value: Buffer;
}

export interface MetaData {
    fingerprint: Fingerprint;
}
export interface TrackMetaData {
    trackId: string;
    score: number;
}

export type FingerprintResult = {
    fingerprint: Fingerprint;
    tracks: TrackMetaData[];
}

export class SongModel {
    private clientConfig: ClientConfig = {
        user: AppConfig.POSTGRES_USER,
        host: AppConfig.POSTGRES_HOST,
        database: "kotori",
        password: AppConfig.POSTGRES_PASSWORD,
        port: AppConfig.POSTGRES_PORT
    };
    private client: Client;

    public constructor() {
        if (AppConfig.APP_TESTMODE_ENABLED) {
            this.clientConfig.database += "_test";
            console.log("Testmode enabled!");
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
                    VALUES ${
                        Array(fingerprints.length).fill(0)
                            .map((e: number, i: number) => "(" + i + ", $" + (i + 1) + ")")
                            .join(",")
                    }
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
     * @returns {FingerprintResult[]} Meta-data values of tracks, grouped by related fingerprints
     */
    public async queryAll(fingerprints: number[][]): Promise<FingerprintResult[]> {
        const metaDataRows: MetaDataRow[] = await this.requestMetaData(fingerprints);
        let results: FingerprintResult[] = fingerprints.map((fp: Fingerprint) => {
            return {fingerprint: fp, tracks: []} as FingerprintResult;
        });

        metaDataRows.forEach(row => {
            let tracks: TrackMetaData[] = results[row.query_idx].tracks,
                lastTrack: TrackMetaData = tracks[tracks.length - 1];
    
            if (!lastTrack || lastTrack.trackId !== row.track_id) {
                lastTrack = {trackId: row.track_id, score: row.score} as TrackMetaData;
                tracks.push(lastTrack);
            }
            (<any>lastTrack)[row.tag_type_name] = Utils.encodeTagValue(row.tag_value);
        });
        return results;
    }
}

class Utils {
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
