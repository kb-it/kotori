"use strict";
import * as nodemailer from "nodemailer";
import {SentMessageInfo, SendMailOptions} from "nodemailer";
export {SentMessageInfo, SendMailOptions};

export class MailerSingleton {
    private static mailerSingleton: MailerSingleton;
    private static mailerOptions = {
        sendmail: true,
        newline: "unix",
        path: "/usr/sbin/sendmail"
    };
    private transporter: nodemailer.Transporter;

    private constructor(options: any) {
        this.transporter = nodemailer.createTransport(options);
    }

    /**
     * @description Sends a mail with given options
     * @param {nodemailer.SendMailOptions} mailOptions Options for mail to be sent
     * @returns {Promise<SentMessageInfo>}
     */
    public async send(mailOptions: nodemailer.SendMailOptions): Promise<SentMessageInfo> {
        const sentMessageInfo = await this.transporter.sendMail(mailOptions);

        console.log("sentMessageInfo:", sentMessageInfo);
        return sentMessageInfo;
    }

    /**
     * @description Returns instance of current class
     * @returns {MailerSingleton}
     */
    public static getInstance() {
        if (!this.mailerSingleton) {
            this.mailerSingleton = new MailerSingleton(this.mailerOptions);
        }

        return this.mailerSingleton;
    }
}
