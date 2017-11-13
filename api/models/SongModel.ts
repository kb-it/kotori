"use strict";
import {Utils} from "../utils/Utils";
import {PGClientSingleton} from "../db/PGClientSingleton";
import {JWTUserData} from "../auth/JWTSingleton";

export type Fingerprint = number[];
type TrackId = number;
type MetaDataRow = {
    track_id: TrackId;
    tag_type_name: string;
    tag_id?: number;
    tag_value: Buffer;
    tag_revision?: number;
    tag_type_id?: number;
};

interface SearchResultRow extends MetaDataRow {
    // the queried fingerprint
    query_idx: number;
    // the matching fingerprint
    fingerprint: Fingerprint;
    fingerprint_id: number;
    // a score indicating how similar the given query fingerprint and fingerprint are
    // a number 0 <= score <= 1
    score: number;
}
interface TrackMetaData extends TrackTag {
    trackId: TrackId;
    score: number;
}
export type QueryResponse = {
    fingerprint: Fingerprint;
    tracks: TrackMetaData[];
};

type TrackTag = {
    [tagName: string]: string|number;
};
type TrackTagData = {
    tagTypeId: number;
    value: number | string;
    revision: number;
};
type TagNameDataMap = {
    [tagName: string]: TrackTagData;
};
type TrackData = {
    trackId: TrackId;
    tags: TagNameDataMap;
};
type TrackDataMap = {
    [trackId: number]: TagNameDataMap;
};

type TagType = {
    id: number;
    name: string;
};

export type UpdateTrackData = {
    trackId: TrackId;
    tags: TrackTag; // several tag-values of a track, mapped to its tagnames (keys)
};
export type InsertTrackData = {
    fingerprint: Fingerprint;
    tags: TrackTag; // several tag-values of a track, mapped to its tagnames (keys)
};

export class SongModel {
    private static pgClient = PGClientSingleton.getClient();
    private static validTagTypesCache: {
        value: TagType[],
        updated_at: number
    };

    /**
     * @description Returns all valid tagtype names from db
     * For performance reasons, tagtype names are stored in internal cache.
     * @returns {Promise<string[]>} All valid tagtype names
     */
    private static async getValidTagTypes(): Promise<TagType[]> {
        const rebuildCacheAfterMin = 15,
            msPerSec = 1000,
            secPerMin = 60,
            mustRebuild = !(this.validTagTypesCache &&
                this.validTagTypesCache.value &&
                this.validTagTypesCache.updated_at + rebuildCacheAfterMin * msPerSec * secPerMin >= Date.now());

        if (mustRebuild) {
            const sql = `SELECT id, name
                    FROM tag_type
                    ORDER BY name`,
                queryResultRows = (await this.pgClient.query(sql)).rows,
                tagTypes: TagType[] = queryResultRows.map(queryResultRow => {
                    return {
                        id: queryResultRow.id,
                        name: queryResultRow.name
                    };
                });

            this.validTagTypesCache = {
                value: tagTypes,
                updated_at: Date.now()
            };
        }

        return this.validTagTypesCache.value;
    }

    /**
     * @description Returns meta-data of specific tracks by its fingerprint
     * @param {number[][]} fingerprints Fingerprints of tracks, whose meta-data shall be retrieved from db
     * @returns {Promise<SearchResult[]>} Table-rows consisting of track-meta-data as returned from DBS
     */
    private static async requestMetaData(fingerprints: number[][]): Promise<SearchResultRow[]> {
        const sql = `SELECT DISTINCT ON (track.id, tag_type.id)
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
                    VALUES ${Utils.toSqlPlaceholderValuesList(fingerprints.length)}
                ) fps JOIN LATERAL (
                    SELECT fingerprint.id,
                           fingerprint.hash,
                           echoprint_compare(fps.column2::int[], fingerprint.hash::int[]) AS score
                    FROM fingerprint
                    ORDER BY score DESC
                    LIMIT 15
                ) matches ON matches.score>0.01
                INNER JOIN track ON track.id_fingerprint = matches.id
                INNER JOIN tag ON tag.id_track = track.id
                INNER JOIN tag_type ON tag.id_tag_type = tag_type.id
            `;
        let results = await this.pgClient.query(sql, fingerprints),
            rows: SearchResultRow[] = results.rows;

        return rows;
    }

    /**
     * @description Requests all meta-data values of several tracks, specified by its fingerprint
     * @param {number[][]} fingerprints Fingerprints of tracks
     * @returns {Promise<FingerprintResult[]>} Meta-data values of tracks, grouped by related fingerprints
     */
    public static async queryAll(fingerprints: number[][]): Promise<QueryResponse[]> {
        const searchResults = await this.requestMetaData(fingerprints);
        let results = fingerprints.map((fp: Fingerprint) => {
            return {fingerprint: fp, tracks: []} as QueryResponse;
        });

        searchResults.forEach(row => {
            let currentTrackId = Utils.parseDecimalInt(String(row.track_id)),
                tracks: TrackMetaData[] = results[row.query_idx].tracks,
                lastTrack: TrackMetaData = tracks[tracks.length - 1];

            if (!lastTrack || lastTrack.trackId !== currentTrackId) {
                lastTrack = {
                    trackId: currentTrackId,
                    score: row.score
                } as TrackMetaData;
                tracks.push(lastTrack);
            }
            (<any>lastTrack)[row.tag_type_name] = Utils.encodeTagValue(row.tag_value);
        });
        return results;
    }

    /**
     * @description Returns meta-data of specific tracks, determined by its track-ids
     * @param {TrackId[]} trackIds Track-ids of tracks, whose meta-data shall be retrieved from db
     * @returns {Promise<MetaDataRow[]>} Table-rows consisting of track-meta-data as returned from DBS
     */
    private static async requestMetaDataRowsByIds(trackIds: TrackId[]): Promise<MetaDataRow[]> {
        const sql = `SELECT DISTINCT ON (track.id, tag_type.id)
                last_value(track.id) OVER (
                    PARTITION BY track.id,
                        tag_type.id
                    ORDER BY tag.revision DESC
                ) AS track_id,
                tag_type.id AS tag_type_id,
                tag_type.name AS tag_type_name,
                tag.value AS tag_value,
                tag.revision AS tag_revision
                FROM track
                LEFT JOIN tag ON tag.id_track = track.id
                LEFT JOIN tag_type ON tag.id_tag_type = tag_type.id
                WHERE track.id = ANY($1)
                ORDER BY track.id, tag_type.id ASC;
            `;
        let queryResultsRows: MetaDataRow[] = (await this.pgClient.query(sql, [trackIds])).rows;

        return queryResultsRows;
    }

    /**
     * @description Converts meta-data of specific tracks into map of track-ids to tag-values
     * @param {MetaDataRow[]} metaDataRows Queryrows, containing track-ids, tag-names and -values and tag-revisions
     * @returns {TrackDataMap}
     */
    private static rowsToTrackTagDataMap(metaDataRows: MetaDataRow[]): TrackDataMap {
        const trackTagMap: TrackDataMap = metaDataRows.reduce((trackTagMap: TrackDataMap, row: MetaDataRow) => {
            const trackId = row.track_id,
                tagTypeId = row.tag_type_id,
                tagValue = Utils.encodeTagValue(row.tag_value) || "",
                revision = row.tag_revision;
            let trackData: TagNameDataMap = (<any> trackTagMap)[trackId];

            if (!trackData) {
                trackData = {} as TagNameDataMap;
                (<any> trackTagMap)[trackId] = trackData;
            }
            trackData[row.tag_type_name] = {
                tagTypeId: tagTypeId as number,
                value: tagValue,
                revision: revision || 0
            };
            return trackTagMap;
        }, {});

        return trackTagMap;
    }

    /**
     * @description Compares tag-names and values from first argument with values of second argument.
     * Values which are not defined in second argument or differ will be returned,
     * where tag-type-id and revision number of currently stored tag value will be added.
     * @param {TrackTag} userTags Object consisting of tag names as keys and related tag values as object values
     * @param {TagNameDataMap} storedTagDataMap Map of tag names to tag value, tag type id & revision-no as stored in db
     * @returns {Promise<TagNameDataMap>} New or defined and differing tags from first argument,
     *                                     where revision-no and tag-type id from second argument are also returned
     */
    private static async getChangedTagDataMap(userTags: TrackTag,
                                            storedTagDataMap: TagNameDataMap): Promise<TagNameDataMap> {
        const userTagNames = Object.getOwnPropertyNames(userTags),
            validTagTypes = await this.getValidTagTypes(),
            changedTagData: TagNameDataMap = await userTagNames.reduce((changedTags, userTagName) => {
                const storedTagData = storedTagDataMap && storedTagDataMap[userTagName],
                    userTagValue = userTags[userTagName],
                    validUserTagValue = userTagValue || (typeof userTagValue === "number" && !isNaN(userTagValue));

                if (validUserTagValue) {
                    const [tagType] = validTagTypes.filter((validTag: TagType) => {
                            return validTag.name === userTagName;
                        }),
                        isKnownTagType = !!tagType,
                        isTagValueUpdated = validUserTagValue && storedTagData && storedTagData.value !== userTagValue;

                    /**
                     * If current tag-type exists in db, tag-value passed from user must be defined and
                     * must differ from stored value.
                     * If current tag-type is not stored in db yet, tag-type must at least be valid.
                     */
                    if (isTagValueUpdated || isKnownTagType) {
                        (<any> changedTags)[userTagName] = {
                            tagTypeId: isTagValueUpdated ? storedTagData.tagTypeId : tagType.id,
                            value: userTagValue,
                            revision: isTagValueUpdated ? storedTagData.revision : 0
                        };
                    } else {
                        throw new TypeError(`Unknown tag '${userTagName}' passed`);
                    }
                }
                return changedTags;
            }, {} as TagNameDataMap);

        return changedTagData;
    }

    /**
     * @description Compares trackdata from first argument with trackdata from second argument, where only
     * new or defined and differing values from first argument, mapped to track-ids will be returned
     * @param {UpdateTrackData[]} userTrackData Objects consisting of track-ids and related tags
     * @param {TrackDataMap} storedTrackTagDataMap Map of track-ids to its related metadata and tags
     * @return {Promise<TrackData[]>}
     */
    private static async getChangedTrackData(userTrackData: UpdateTrackData[],
                                            storedTrackTagDataMap: TrackDataMap): Promise<TrackData[]> {
        let updateTrackData: TrackData[] = [];

        for (let updateTrack of userTrackData) {
            const storedTrackTags: TagNameDataMap = (<any> storedTrackTagDataMap)[updateTrack.trackId];

            if (storedTrackTags && Object.keys(storedTrackTags).length) {
                if (updateTrack.tags) {
                    const changedTags = await this.getChangedTagDataMap(updateTrack.tags, storedTrackTags),
                        hasChangedTags = Object.keys(changedTags).length;

                    if (hasChangedTags) {
                        updateTrackData.push({
                            trackId: updateTrack.trackId,
                            tags: changedTags
                        });
                    }
                }
            } else {
                throw TypeError(`Unknown trackId: ${updateTrack.trackId}`);
            }
        }
        return updateTrackData;
    }

    /**
     * @description Returns meta data of a stored track and its related tags
     * @param {UpdateTrackData[]} updateDataList Queryrows containing ids of tracks, whose metadata shall be returned
     * @returns {Promise<TrackDataMap>}
     */
    private static async getStoredTrackDataMap(updateDataList: UpdateTrackData[]): Promise<TrackDataMap> {
        const metaDataRows = await this.requestMetaDataRowsByIds(
                updateDataList.map(trackData => trackData.trackId)
            );
        const storedTrackDataMap = this.rowsToTrackTagDataMap(metaDataRows);

        return storedTrackDataMap;
    }

    /**
     * @description Inserts new revision of tag-values from a specific track into db
     * @param {object} obj Wrapper for trackData and userData
     * @param {TrackData} obj.trackData Contains tag and track data of a specific track for performing a insert
     * @param {JWTUserData} obj.userData Contains id of a user-record
     */
    private static async insertTrackData({trackData, userData}: {trackData: TrackData, userData: JWTUserData}) {
        const tagNames = Object.getOwnPropertyNames(trackData.tags),
            placeholders = tagNames.map((_: string, trackIdx: number) => {
                const colCount = 5, // id_tag_type, id_track, id_user, revision, value
                    $s = Array(colCount).fill("$");

                return "(" + $s.map(($, tagIdx) => $ + ((trackIdx * colCount) + (tagIdx + 1))).join(",") + ")";
            }).join(","),
            sql = `INSERT INTO tag(id_tag_type, id_track, id_user, revision, value) VALUES ${placeholders}`,
            parameters = tagNames.reduce((parameters, tagName) => {
                const trackTagData = trackData.tags[tagName];

                return parameters.concat(<string[]>[
                    trackTagData.tagTypeId,
                    trackData.trackId,
                    userData.id,
                    trackTagData.revision + 1,
                    trackTagData.value
                ]);
            }, [] as string[]);

        this.pgClient.query(sql, parameters);
    }

    /**
     * @description Inserts valid tags, which differ from previous state, into db
     * @param {JWTUserData} jwtUserData JWTUserData of the user-account, which triggers the update
     * @param {UpdateTrackData[]} updateDataList Tag-values mapped to its related track-ids
     * @returns {boolean} Equals true if update has been successfully processed
     */
    private static async updateMetaData(jwtUserData: JWTUserData, updateDataList: UpdateTrackData[]): Promise<void> {
        const storedTrackTagDataMap = await this.getStoredTrackDataMap(updateDataList),
            updateTrackData = await this.getChangedTrackData(updateDataList, storedTrackTagDataMap);

        for (let trackData of updateTrackData) {
            await this.insertTrackData({trackData: trackData, userData: jwtUserData});
        }
    }

    /**
     * @description Creates new db-records for passed tag-values of specific tracks in a single transaction,
     * where invalid tags are skipped and unknown tracks throw error
     * @param {JWTUserData} jwtUserData JWTUserData of the user-account, which triggers the update
     * @param {UpdateTrackData[]} updateDataList Tag-values mapped to its related track-ids
     * @returns {boolean} Equals true if update has been successfully processed
     */
    public static async updateAll(jwtUserData: JWTUserData, updateDataList: UpdateTrackData[]): Promise<void> {
        await this.executeInTransaction(async () => {
            await this.updateMetaData(jwtUserData, updateDataList);
        });
    }

    /**
     * @description Inserts a new track into db and returns id of related record.
     * If no related fingerprint-record exists yet, one will be created.
     * @param {Fingerprint} fingerprint Fingerprint related to the new track
     * @param {number} userId ID of the user, who triggers insertion of new track
     * @returns {number} Id of track-record
     */
    private static async insertTrack(fingerprint: Fingerprint, userId: number): Promise<number> {
        const sql = `
                WITH fp_select AS (
                    SELECT id
                    FROM fingerprint
                    WHERE hash = $1
                ), fp_insert AS (
                    INSERT INTO fingerprint(hash)
                    SELECT $1
                    WHERE NOT EXISTS(
                        SELECT id
                        FROM fp_select
                    )
                    RETURNING id
                ), fp_id AS (
                    SELECT id
                    FROM fp_select
                    UNION
                    SELECT id
                    FROM fp_insert
                ) INSERT INTO track(id_user, id_fingerprint)
                    SELECT $2, id AS id_fingerprint
                    FROM fp_id
                    RETURNING track.id AS track_id
            `,
            [firstResultRow] = (await this.pgClient.query(sql, [fingerprint, userId])).rows,
            {track_id: trackId}: {track_id: number} = firstResultRow;

        return trackId;
    }

    /**
     * @description Inserts tags and tracks for specified fingerprints in db as user, determined by its id.
     * If fingerprints itself do not exist yet, fingerprints will be inserted as well.
     * @param {JWTUserData} jwtUserData Data of user, who triggers insertion of new track
     * @param {InsertTrackData} insertDataList Tags and tracks mapped to fingerprints to be inserted
     */
    public static async insertAll(jwtUserData: JWTUserData, insertDataList: InsertTrackData[]): Promise<void> {
        await this.executeInTransaction(async () => {
            const updateDataList: UpdateTrackData[] = await Promise.all(insertDataList.map(
                async (trackData: InsertTrackData) => {
                    const trackId = await this.insertTrack(trackData.fingerprint, jwtUserData.id),
                        updateTrackData: UpdateTrackData = {
                            trackId: trackId,
                            tags: trackData.tags
                        };

                    return updateTrackData;
                }));

            await this.updateMetaData(jwtUserData, updateDataList);
        });
    }

    /**
     * @description Returns all valid tag names
     * @returns {string[]} Valid tag names
     */
    public static async getTagNames(): Promise<string[]> {
        const validTagTypes = await this.getValidTagTypes(),
            tagNames: string[] = validTagTypes.map((validTagType: TagType) => {
                return validTagType.name;
            });

        return tagNames;
    }

    /**
     * @description Returns metadata of specific tracks, where tracks are paginated and ordered by a specific criteria.
     * Metadata can optionally be filtered for specific tag values.
     * @param {number} limit Not more than specified amount of results will be returned per call
     * @param {number} offset Amount of rows, which will be skipped before beginning to return rows
     * @returns {Promise<TrackData[]>}
     */
    public static async getPaginatedTracks(limit: number, offset: number): Promise<TrackData[]> {
        const sql = `SELECT track.id AS track_id,
                    tag_type.name AS tag_type_name,
                    tag.value AS tag_value,
                    tag.created_at AS tag_created_at
                FROM track
                INNER JOIN tag ON track.id = tag.id_track
                INNER JOIN tag_type ON tag.id_tag_type = tag_type.id
                ORDER BY track.id_fingerprint, track.id, tag_type_name
                LIMIT $1
                OFFSET $2`,
            queryParameters: string[] = [String(limit), String(offset)];
        let queryResultRows = (await this.pgClient.query(sql, queryParameters)).rows,
            trackData: TrackData[] = queryResultRows.reduce((trackData: TrackData[], row) => {
                const tagName = row.tag_type_name,
                    tagValue = Utils.encodeTagValue(row.tag_value);
                let track: TrackData = trackData[trackData.length - 1];

                if (!track || track.trackId !== row.track_id) {
                    track = {trackId: row.track_id, tags: {}} as TrackData;
                    trackData.push(track);
                }
                (<any> track.tags)[tagName] = tagValue;
                return trackData;
            }, [] as TrackData[]);

        return trackData;
    }

    /**
     * @description Executes a passed function in postgres transaction
     * @param {Function} queryFn Function, using sql-queries which shall be executed as transaction
     */
    private static async executeInTransaction(queryFn: Function) {
        try {
            await this.pgClient.query("BEGIN");
            await queryFn();
            await this.pgClient.query("COMMIT");
        } catch (e) {
            await this.pgClient.query("ROLLBACK");
            throw e;
        }
    }
}
