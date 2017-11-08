"use strict";
import {AppConfig} from "../config/AppConfig";
import {Client, ClientConfig} from "pg";

export class PGClientSingleton {
    private static client: Client;
    private static clientConfig: ClientConfig = {
        user: AppConfig.POSTGRES_USER,
        host: AppConfig.POSTGRES_HOST,
        database: "kotori",
        password: AppConfig.POSTGRES_PASSWORD,
        port: AppConfig.POSTGRES_PORT
    };

    /**
     * @description Creates postgres-client singleton
     * @returns {Client} Postgres-client
     */
    private static createClient(): Client {
        let client: Client;

        if (AppConfig.APP_TESTMODE_ENABLED) {
            this.clientConfig.database += "_test";
            console.log("Testmode enabled!");
        }
        client = new Client(this.clientConfig);
        client.connect();
        this.client = client;
        return client;
    }

    /**
     * @description Returns postgres-client singleton
     * @returns {Client} Postgres-client
     */
    public static getClient(): Client {
        if (PGClientSingleton.client) {
            return this.client;
        } else {
            return this.createClient();
        }
    }
}
