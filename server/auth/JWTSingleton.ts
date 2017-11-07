"use strict";
import {Utils} from "../utils/Utils";
import {AppConfig} from "../config/AppConfig";
import * as jwt from "jsonwebtoken";

const jwtOptions = {
    algorithm: "HS512",
    issuer: "kotorimusic.ga"
};

export type JWTUserData = {
    id: number;
};

interface JWTData extends JWTUserData {
    iat: number;
    exp: number;
    iss: string;
}

export type JWTOptions = {
    /**
     * @member {string} - expressed in seconds or a string describing a time span
     *                     [zeit/ms](https://github.com/zeit/ms.js). Eg: 60, "2 days", "10h", "7d".
     *                     **Default**: "15m"
     * */
    expiresIn: string | number;
};

export class JWT {
    private secret: string;
    private static jwt: JWT;

    private constructor() {
        if (AppConfig.JWT_SECRET) {
            this.secret = AppConfig.JWT_SECRET;
        } else {
            throw new ReferenceError("No JWT_SECRET defined!");
        }
    }

    /**
     * @description Creates a new JWT containing passed payload
     * @param {string | object | Buffer} payload Payload of JWT to be created
     * @param {JWTOptions} options Optional options for JWT creation
     * @returns {Promise<string>}
     */
    private async sign(payload: string | object | Buffer, options?: JWTOptions): Promise<string> {
        const token = await jwt.sign(payload, this.secret, {
            algorithm: jwtOptions.algorithm,
            expiresIn: options ? options.expiresIn : "15m",
            issuer: jwtOptions.issuer
        });

        return token;
    }

    /**
     * @description Converts a JWTData-instance to a JWTUserData-instance by removing all JWTData exclusive values
     * @param {JWTData} jwtData Instance of Object implementing JWTData-interface
     * @returns {JWTUserData}
     */
    private getTokenData(jwtData: JWTData): JWTUserData {
        const validKeys = [{
                key: "id",
                format: (val: string) => Utils.parseDecimalInt(val)
            }];
        let tokenData = {};

        validKeys.forEach(validKeyData => {
            (<any>tokenData)[validKeyData.key] = validKeyData.format((<any> jwtData)[validKeyData.key]);
        });
        return tokenData as JWTUserData;
    }

    /**
     * @description Verifies the passed JWT and returns its content
     * @param {string} token JWT, which shall be verified
     * @returns {JWTUserData}
     */
    public async verify(token: string): Promise<JWTUserData> {
        let tokenData;

        try {
            tokenData = this.getTokenData(await <JWTData> jwt.verify(token, this.secret, {
                algorithms: [jwtOptions.algorithm],
                issuer: jwtOptions.issuer
            }));
        } catch (e) {
            if (e.name === "TokenExpiredError") {
                throw Error("Session expired. Please log in again!");
            } else {
                throw e;
            }
        }
        return tokenData;
    }


    /**
     * @description Creates a jwt containing a specific userId
     * @param {Number} userId ID of a user, which will be stored in jwt
     * @returns {String} JWT
     */
    public async getUserJWT(userId: number): Promise<string> {
        const payload = {
            id: userId
        },
        token = await this.sign(payload);

        return token;
    }

    /**
     * @description Returns instance of current class
     * @returns {JWT}
     */
    public static getInstance(): JWT {
        if (!this.jwt) {
            this.jwt = new JWT();
        }

        return this.jwt;
    }
}
