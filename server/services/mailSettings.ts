export interface MailSettings {
  companyName: string;
  fromEmail: string;

  // SMTP (отправка)
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;

  // IMAP/POP3 (получение)
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
}

// Настройки почты берём из переменных окружения, чтобы не хранить пароли в коде.
// При необходимости их можно изменить здесь по умолчанию.
export const mailSettings: MailSettings = {
  companyName: process.env.MAIL_COMPANY_NAME || 'ОДО «Комсистем»',
  fromEmail: process.env.MAIL_FROM || process.env.MAIL_USER || '',

  smtpHost: process.env.MAIL_HOST || 'smtp.example.com',
  smtpPort: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587,
  smtpSecure: process.env.MAIL_SECURE === 'true',
  smtpUser: process.env.MAIL_USER || '',
  smtpPassword: process.env.MAIL_PASSWORD || '',

  // По умолчанию для IMAP используем те же хост/логин, но другой порт
  imapHost: process.env.MAIL_IMAP_HOST || process.env.MAIL_HOST || 'imap.example.com',
  imapPort: process.env.MAIL_IMAP_PORT
    ? Number(process.env.MAIL_IMAP_PORT)
    : 993,
  imapSecure: process.env.MAIL_IMAP_SECURE
    ? process.env.MAIL_IMAP_SECURE === 'true'
    : true,
  imapUser: process.env.MAIL_IMAP_USER || process.env.MAIL_USER || '',
  imapPassword: process.env.MAIL_IMAP_PASSWORD || process.env.MAIL_PASSWORD || '',
};

