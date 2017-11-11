"use strict";
import {MailerSingleton, SentMessageInfo, SendMailOptions} from "./MailerSingleton";

enum URL_TYPE {
    ACTIVATION
}

export class AppMailer {
    private static mailer = MailerSingleton.getInstance();
    private static hostName = "kotorimusic.ga";
    private static urlHost = `https://${AppMailer.hostName}`;
    private static from = `noreply@${AppMailer.hostName}`;

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

    private static getMailOptions({to, subject, text}: {to: string | string[],
                                subject: string, text: string}): SendMailOptions {
        const mailOptions = {
            from: this.from,
            to,
            subject,
            text
        };

        return mailOptions;
    }

    /**
     * Sends welcome-mail, containing activation-link for a specific user-account, to an user
     * @param {object} obj wrapper for to- and activationToken value
     * @param {string | string[]} obj.to Address of one or many mail-recipients
     * @param {string} activationToken Token, which is expected from server for activating a user-account
     * @returns {Promise<SentMessageInfo>} Information about sent message
     */
    public static async sendRegistrationMail({to, activationToken}: {to: string | string[],
                                                activationToken: string}): Promise<SentMessageInfo> {
        const activationLink = [
                this.getApiUrl(URL_TYPE.ACTIVATION),
                activationToken
            ].join("/"),
            subject = "Welcome to Kotori",
            text = `Konichiwa ${to}!

                Welcome to Kotori! Thanks so much for joining us.

                Kotori (japanese: songbird) is a free song managing and tagging app.

                To activate your account and be ready to start, please click on the link below:
                ${activationLink}

                If the link does not open, copy the URL directly into your browser.

                Cheerfully yours,
                The Kotori Team`,
            mailOptions = this.getMailOptions({to, subject, text});

        return await this.mailer.send(mailOptions);
    }

    /**
    * Sends mail, containing new activation-link for a specific user-account, to an user
    * @param {object} obj wrapper for to- and activationToken value
    * @param {string | string[]} obj.to Address of one or many mail-recipients
    * @param {string} activationToken Token, which is expected from server for activating a user-account
    * @returns {Promise<SentMessageInfo>} Information about sent message
    */
    public static async sendActivationTokenMail({to, activationToken}: {to: string | string[],
                                                activationToken: string}): Promise<SentMessageInfo> {
        const activationLink = [
                this.getApiUrl(URL_TYPE.ACTIVATION),
                activationToken
            ].join("/"),
            subject =  "Kotori - Your activation link",
            text = `Konichiwa ${to}!

                    You requested a new link for activating your previously created user account on Kotori.

                    Kotori (japanese: songbird) is a free song managing and tagging app.

                    To activate your account and be ready to start, please click on the link below:
                    ${activationLink}

                    If the link does not open, copy the URL directly into your browser.

                    Cheerfully yours,
                    The Kotori Team`,
            mailOptions = this.getMailOptions({to, subject, text});

        return await this.mailer.send(mailOptions);
    }

    /**
     * Sends mail, containing password-reset-link for a specific user-account, to an user
     * @param {object} obj wrapper for to- and activationToken value
     * @param {string | string[]} obj.to Address of one or many mail-recipients
     * @param {string} activationToken Token, which is expected from server for resetting password of a user-account
     * @returns {Promise<SentMessageInfo>} Information about sent message
     */
    public static async sendForgotPwMail({to, pwResetToken}: {to: string, pwResetToken: string}) {

    }
}
