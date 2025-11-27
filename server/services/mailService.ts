import nodemailer from 'nodemailer';
import { mailSettings } from './mailSettings.js';

const transporter = nodemailer.createTransport({
  host: mailSettings.smtpHost,
  port: mailSettings.smtpPort,
  secure: mailSettings.smtpSecure,
  auth: mailSettings.smtpUser
    ? {
        user: mailSettings.smtpUser,
        pass: mailSettings.smtpPassword,
      }
    : undefined,
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendEmailOptions): Promise<void> {
  if (!mailSettings.fromEmail) {
    throw new Error('MAIL_FROM или MAIL_USER не настроены в переменных окружения');
  }

  await transporter.sendMail({
    from: mailSettings.fromEmail,
    to,
    subject,
    text,
  });
}



