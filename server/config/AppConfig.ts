"use strict";
import {Utils} from "../utils/Utils";

type ConfigMap = {
    APP_TESTMODE_ENABLED: boolean;
    EXPRESS_PORT: number;
    JWT_SECRET: string | undefined;
    POSTGRES_HOST: string | undefined;
    POSTGRES_PORT: number;
    POSTGRES_USER: string | undefined;
    POSTGRES_PASSWORD: string | undefined;
};

export class AppConfig {
    private static readonly configMap: ConfigMap = (() => {
        const decimalNumBase = 10,
            configKeyMap = {
                APP_TESTMODE_ENABLED: {
                    format: (value: any) => process.env.NODE_ENV !== "production" || value === "true"
                },
                EXPRESS_PORT: {
                    format: (value: any) => parseInt(String(value), decimalNumBase)
                },
                JWT_SECRET: {
                    format: (value: any) => String(value)
                },
                POSTGRES_HOST: {
                    format: (value: any) => String(value)
                },
                POSTGRES_PORT: {
                    format: (value: any) => parseInt(String(value), decimalNumBase)
                },
                POSTGRES_USER: {
                    format: (value: any) => String(value)
                },
                POSTGRES_PASSWORD: {
                    format: (value: any) => String(value)
                }
            },
            configMap: ConfigMap = Object.getOwnPropertyNames(configKeyMap).reduce((configMap: ConfigMap, key) => {
                const value = process.argv.reduce((values: string[], arg: string) => {
                        const [argKey, argVal] = arg.split("=");

                        if (key === argKey.replace(/^--/, "")) {
                            values.push(argVal);
                        }
                        return values;
                    }, [])[0] || process.env[key],
                    formatValueFn = (<any> configKeyMap)[key].format;

                (<any> configMap)[key] = formatValueFn(value);
                return configMap;
            }, <ConfigMap>{});

        return configMap;
    })();

    public static readonly APP_TESTMODE_ENABLED: boolean = AppConfig.configMap.APP_TESTMODE_ENABLED;
    public static readonly EXPRESS_PORT: number = AppConfig.configMap.EXPRESS_PORT;
    public static readonly JWT_SECRET: string | undefined = AppConfig.configMap.JWT_SECRET;
    public static readonly POSTGRES_PORT: number = AppConfig.configMap.POSTGRES_PORT;
    public static readonly POSTGRES_HOST: string | undefined = AppConfig.configMap.POSTGRES_HOST;
    public static readonly POSTGRES_USER: string | undefined = AppConfig.configMap.POSTGRES_USER;
    public static readonly POSTGRES_PASSWORD: string | undefined = AppConfig.configMap.POSTGRES_PASSWORD;
}
