import status from "http-status";
import nodemailer from "nodemailer";
import { envVars } from "../config/env";
import AppError from "../errorHelper/AppError";
import { generateEmailTemplate } from "../templates/htmlEmail";
import { logger } from "../lib/pino";

const smtpPort = Number(envVars.EMAIL_SENDER.SMTP_PORT);
const transporter = nodemailer.createTransport({
    host : envVars.EMAIL_SENDER.SMTP_HOST,
    port: smtpPort,
    // Port 465 expects implicit TLS (secure=true). Port 587/25 typically uses STARTTLS (secure=false).
    secure: smtpPort === 465,
    auth: {
        user: envVars.EMAIL_SENDER.SMTP_USER,
        pass: envVars.EMAIL_SENDER.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
})

interface SendEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    templateData: Record<string, any>;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[]
}


export const sendEmail = async ({subject, templateData, templateName, to, attachments} : SendEmailOptions) => {
    try {
        const info = await transporter.sendMail({
            from: `Planora <${envVars.EMAIL_SENDER.SMTP_USER}>`,
            to : to,
            subject : subject,
            html : generateEmailTemplate(templateName,templateData),
            attachments: attachments?.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType,
            }))
        })

        logger.info(`Email sent to ${to}: ${info.messageId}`);
    } catch (error : any) {
        logger.error({
            message: error?.message,
            code: error?.code,
            command: error?.command,
            responseCode: error?.responseCode,
        }, "Email sending failed");
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to send email");
    }
}