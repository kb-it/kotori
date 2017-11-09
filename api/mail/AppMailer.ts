"use strict";
import {MailerSingleton, SentMessageInfo} from "./MailerSingleton";

enum URL_TYPE {
    ACTIVATION
}

export class AppMailer {
    private static mailer = MailerSingleton.getInstance();
    private static hostName = "kotorimusic.ga";
    private static urlHost = `https://${AppMailer.hostName}`;
    private static fromName = `noreply@${AppMailer.hostName}`;

    /**
     * @description Assembles specific url, determined by its type
     * @param {URL_TYPE} type Value of enum URL_TYPE
     * @returns {string}
     */
    private static getApiUrl(type: URL_TYPE): string {
        const apiVersion = "v1";
        let url: string;

        switch (type) {
            case URL_TYPE.ACTIVATION:
                url = [
                    this.urlHost,
                    "api",
                    apiVersion,
                    "user",
                    "activation"
                ].join("/");
                break;
            default:
                throw Error("Unknown url-type");
        }
        return url;
    }

    /**
     * Sends mail, containing activation-link for a specific user-account, to an user
     * @param {object} obj wrapper for to- and activationToken value
     * @param {string | string[]} obj.to Address of one or many mail-recipients
     * @param {string} activationToken Token, which is expected from server for activating a user-account
     * @returns {boolean} success
     */
    public static async sendRegistrationMail({to, activationToken}: {to: string | string[],
                                                activationToken: string}): Promise<SentMessageInfo> {
        const activationLink = [
                this.getApiUrl(URL_TYPE.ACTIVATION),
                activationToken
            ].join("/"),
            mailOptions = {
                from: this.fromName,
                to: to,
                subject: "Welcome to Kotori",
                text: `Konichiwa ${to}!

                    Welcome to Kotori! Thanks so much for joining us.

                    Kotori (japanese: songbird) is a free song managing and tagging app.

                    To activate your account and be ready to start, please click on the link below:
                    ${activationLink}

                    If the link does not open, copy the URL directly into your browser.

                    Cheerfully yours,
                    The Kotori Team`
            };

        return await this.mailer.send(mailOptions);
    }


    public static async sendActivationTokenMail({to, activationToken}: {to: string, activationToken: string}) {
        const activationLink = [
                this.getApiUrl(URL_TYPE.ACTIVATION),
                activationToken
            ].join("/"),
            mailOptions = {
                from: this.fromName,
                to: to,
                subject: "Kotori - Your activation link",
                text: `Konichiwa ${to}!

                        You requested a new link for activating your previously created user account on Kotori.

                        Kotori (japanese: songbird) is a free song managing and tagging app.

                        To activate your account and be ready to start, please click on the link below:
                        ${activationLink}

                        If the link does not open, copy the URL directly into your browser.

                        Cheerfully yours,
                        The Kotori Team`
            };

        return await this.mailer.send(mailOptions);
    }
}
