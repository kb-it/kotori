"use strict";
import {MailerSingleton, SentMessageInfo, SendMailOptions} from "./MailerSingleton";

enum URL_TYPE {
    ACTIVATION,
    ACTIVATION_LINK,
    PW_RESET
}

export class AppMailer {
    private static mailer = MailerSingleton.getInstance();
    private static hostName = "kotorimusic.ga";
    private static urlHost = `https://${AppMailer.hostName}`;
    private static actionHost = [AppMailer.urlHost, "#"].join("/");
    private static from = `noreply@${AppMailer.hostName}`;

    /**
     * @description Assembles specific url, determined by its type
     * @param {URL_TYPE} type Value of enum URL_TYPE
     * @returns {string}
     */
    private static getApiUrl(type: URL_TYPE): string {
        let url: string;

        switch (type) {
            case URL_TYPE.ACTIVATION:
                url = [
                    this.actionHost,
                    "activate"
                ].join("/");
                break;
            case URL_TYPE.ACTIVATION_LINK:
                url = [
                    this.actionHost,
                    "activate",
                    "token"
                ].join("/");
                break;
            case URL_TYPE.PW_RESET:
                url = [
                    this.actionHost,
                    "reset"
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
     * @param {object} obj wrapper for several mailOptions
     * @param {string | string[]} obj.to Address of one or many mail-recipients
     * @param {string} obj.activationToken Token, which is expected from server for activating a user-account
     * * @param {number} obj.tokenExpiresAfter Activation token is only valid for specified number of hours
     * @returns {Promise<SentMessageInfo>} Information about sent message
     */
    public static async sendRegistrationMail({to, activationToken, tokenExpiresAfter}: {to: string | string[],
                                        activationToken: string, tokenExpiresAfter: number}): Promise<SentMessageInfo> {
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

                For security reasons the activation-link expires automatically after ${tokenExpiresAfter} hour.
                If your link expired too soon, visit https://${this.hostName} and request a new activation-link.

                Cheerfully yours,
                The Kotori Team`,
            mailOptions = this.getMailOptions({to, subject, text});

        return await this.mailer.send(mailOptions);
    }

    /**
    * Sends a mail, containing new activation-link for a specific user-account, to an user
    * @param {object} obj wrapper for several mailOptions
    * @param {string | string[]} obj.to Address of one or many mail-recipients
    * @param {string} obj.activationToken Token, which is expected from server for activating a user-account
    * @param {number} obj.tokenExpiresAfter Activation token is only valid for specified number of hours
    * @returns {Promise<SentMessageInfo>} Information about sent message
    */
    public static async sendActivationTokenMail({to, activationToken, tokenExpiresAfter}: {to: string | string[],
                                        activationToken: string, tokenExpiresAfter: number}): Promise<SentMessageInfo> {
        const activationLink = [
                this.getApiUrl(URL_TYPE.ACTIVATION),
                activationToken
            ].join("/"),
            subject =  "Your activation link",
            text = `Konichiwa ${to}!

                    You requested a new link for activating your previously created user account on Kotori.

                    Kotori (japanese: songbird) is a free song managing and tagging app.

                    To activate your account and be ready to start, please click on the link below:
                    ${activationLink}

                    If the link does not open, copy the URL directly into your browser.

                    For security reasons the activation-link expires automatically after ${tokenExpiresAfter} hour.
                    If your link expired too soon, visit https://${this.hostName} and request a new activation-link.

                    Cheerfully yours,
                    The Kotori Team`,
            mailOptions = this.getMailOptions({to, subject, text});

        return await this.mailer.send(mailOptions);
    }

    /**
     * Sends mail, containing password-reset-link for a specific user-account, to an user
     * @param {object} obj wrapper for several mailOptions
     * @param {string | string[]} obj.to Address of one or many mail-recipients
     * @param {string} obj.pwResetToken Token, which is expected from server for resetting password of a user-account
     * * @param {number} obj.tokenExpiresAfter Password-reset-token is only valid for specified number of hours
     * @returns {Promise<SentMessageInfo>} Information about sent message
     */
    public static async sendForgotPwMail({to, pwResetToken, tokenExpiresAfter}: {to: string | string[],
                                        pwResetToken: string, tokenExpiresAfter: number}): Promise<SentMessageInfo> {
        const pwResetLink = [
                this.getApiUrl(URL_TYPE.PW_RESET),
                pwResetToken
            ],
            subject = "Reset your Password",
            text = `Konichiwa ${to}!

                We have received a request to reset your password.

                If you did not request a password reset, you can safely ignore this email.
                Only a person with access to your email can reset your account password.

                To reset your password, please click on the link below:
                ${pwResetLink}

                If the link does not open, copy the URL directly into your browser.

                For security reasons the password-reset-link expires automatically after ${tokenExpiresAfter} hour.
                If your link expired too soon, visit https://${this.hostName} and request a new password-reset-link.

                Cheerfully yours,
                The Kotori Team
            `,
            mailOptions = this.getMailOptions({to, subject, text});

        return await this.mailer.send(mailOptions);
    }
}
