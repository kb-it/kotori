"use strict";
import {AppConfig} from "../config/AppConfig";
import {Response} from "express";

export class Utils {
    /**
     * Parses string argument and returns an integer of decimal numeral system
     * @param {String} value The value to parse
     * @returns {number} An integer parsed from given string
     */
    public static parseDecimalInt(value: string) {
        const decimalNumBase = 10,
            parsedInt = parseInt(value, decimalNumBase);

        return parsedInt;
    }

    /**
     * @description Converts value of a tag, represented by a Buffer, to an UTF8 string
     * @param {Buffer} tagValueBuffer Value of a tag as Buffer
     * @returns {string} UTF8-encoded tag value
     */
    public static encodeTagValue(tagValueBuffer: Buffer): string | undefined {
        let tagValue;

        if (tagValueBuffer) {
            tagValue = Buffer.from(tagValueBuffer).toString("utf-8");
        }
        return tagValue;
    }

    /**
     * @description Creates a parameterized values list consisting of a specific number of placeholders
     * @param {number} placeholderCount Number of placeholders
     * @returns {string} Parameterized values list consisting of placeholders as expected from pg-module in query-method
     */
    public static toSqlPlaceholderValuesList(placeholderCount: number): string {
        const sql = Array(placeholderCount).fill(0)
            .map((value: number, i: number) => "(" + i + ", $" + (i + 1) + ")")
            .join(",");

        return sql;
    }

    /**
     * @description Sets JWT as Authorization-Header of passed Response-instance
     * @param {Response} response Response-instance the authorization-header will be set on
     * @param {string} token JWT, which will be added to response
     */
    public static addJWTToResponse(response: Response, token: string) {
        response.set("Authorization", "Bearer " + token);
    }

    /**
     * @description Returns value of first passed parameter if APP_TESTMODE_ENABLED is set true, otherwise
     *     second value will be returned
     * @param {T} testmodeValue Value, which will be returned if APP_TESTMODE_ENABLED is set to true
     * @param {T} defaultValue Value, which will be returned if APP_TESTMODE_ENABLED is set to false
     * @return {T}
     */
    public static getTestmodeDependingValue<T>(testmodeValue: T | undefined, defaultValue: T): T {
        let value: T = AppConfig.APP_TESTMODE_ENABLED && (testmodeValue || typeof testmodeValue === "number") ?
            testmodeValue : defaultValue;

        return value;
    }
}
