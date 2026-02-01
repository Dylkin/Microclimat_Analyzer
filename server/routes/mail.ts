import express from 'express';
import { sendEmail } from '../services/mailService.js';
import { mailSettings } from '../services/mailSettings.js';
import {
  syncEmailsForContactEmail,
  getStoredEmailsByContactId,
} from '../services/mailReceiveService.js';

const router = express.Router();

interface Recipient {
  email: string;
  fullName: string;
}

// GET /api/mail/settings - получить текущие настройки (для UI)
router.get('/settings', async (req, res) => {
  try {
    res.json({
      companyName: mailSettings.companyName,
      host: mailSettings.smtpHost,
      port: mailSettings.smtpPort,
      secure: mailSettings.smtpSecure,
      user: mailSettings.smtpUser,
      // пароль не отдаем в UI
      password: '',
      from: mailSettings.fromEmail,
      // Базовые IMAP-настройки (без пароля)
      imapHost: mailSettings.imapHost,
      imapPort: mailSettings.imapPort,
      imapSecure: mailSettings.imapSecure,
      imapUser: mailSettings.imapUser,
    });
  } catch (error: any) {
    console.error('Ошибка получения настроек почты:', error);
    res.status(500).json({
      error: 'Ошибка получения настроек почты',
      details: error?.message || 'Неизвестная ошибка',
    });
  }
});

// POST /api/mail/settings - сохранить настройки (на текущий запуск процесса)
router.post('/settings', async (req, res) => {
  try {
    const {
      companyName,
      host,
      port,
      secure,
      user,
      password,
      from,
      imapHost,
      imapPort,
      imapSecure,
      imapUser,
      imapPassword,
    } = req.body || {};

    mailSettings.companyName = companyName || mailSettings.companyName;
    mailSettings.smtpHost = host || mailSettings.smtpHost;
    mailSettings.smtpPort =
      typeof port === 'number' && port > 0 ? port : mailSettings.smtpPort;
    mailSettings.smtpSecure = !!secure;
    if (user) {
      mailSettings.smtpUser = user;
    }
    if (password) {
      mailSettings.smtpPassword = password;
    }
    if (from) {
      mailSettings.fromEmail = from;
    }

    // IMAP
    if (imapHost) {
      mailSettings.imapHost = imapHost;
    }
    if (typeof imapPort === 'number' && imapPort > 0) {
      mailSettings.imapPort = imapPort;
    }
    if (typeof imapSecure === 'boolean') {
      mailSettings.imapSecure = imapSecure;
    }
    if (imapUser) {
      mailSettings.imapUser = imapUser;
    }
    if (imapPassword) {
      mailSettings.imapPassword = imapPassword;
    }

    res.json({
      success: true,
      message: 'Настройки почты применены для текущего процесса сервера. Для постоянного сохранения обновите .env.',
    });
  } catch (error: any) {
    console.error('Ошибка сохранения настроек почты:', error);
    res.status(500).json({
      error: 'Ошибка сохранения настроек почты',
      details: error?.message || 'Неизвестная ошибка',
    });
  }
});

// GET /api/mail/messages/by-contact/:contactId - получить сохранённые сообщения по contactId
router.get('/messages/by-contact/:contactId', async (req, res) => {
  try {
    const contactId = req.params.contactId;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (!contactId) {
      return res.status(400).json({ error: 'Не указан contactId' });
    }

    const messages = await getStoredEmailsByContactId(contactId, limit);
    res.json({ messages });
  } catch (error: any) {
    console.error('Ошибка получения сообщений по contactId:', error);
    res.status(500).json({
      error: 'Ошибка получения сообщений по contactId',
      details: error?.message || 'Неизвестная ошибка',
    });
  }
});

// POST /api/mail/messages/sync-for-email - синхронизировать и вернуть сообщения по e-mail сотрудника
router.post('/messages/sync-for-email', async (req, res) => {
  try {
    const { email, limit } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Не указан e-mail' });
    }

    const messages = await syncEmailsForContactEmail(email, limit || 50);
    res.json({ messages });
  } catch (error: any) {
    console.error('Ошибка синхронизации сообщений по e-mail:', error);
    res.status(500).json({
      error: 'Ошибка синхронизации сообщений по e-mail',
      details: error?.message || 'Неизвестная ошибка',
    });
  }
});

// POST /api/mail/send-requests
// Отправка писем с запросом коммерческого предложения по одному товару
router.post('/send-requests', async (req, res) => {
  try {
    const {
      projectId,
      itemId,
      itemName,
      quantity,
      description,
      userFullName,
      userPhone,
      recipients,
    } = req.body;

    if (!projectId || !itemId || !itemName || !quantity) {
      return res.status(400).json({ error: 'Не указаны данные товара или проекта' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Не указаны получатели' });
    }

    const validRecipients: Recipient[] = recipients.filter(
      (r: any) => r && typeof r.email === 'string' && r.email.trim().length > 0
    );

    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'У получателей не указаны e-mail адреса' });
    }

    const results: { email: string; status: 'ok' | 'error'; error?: string }[] = [];

    for (const recipient of validRecipients) {
      const to = recipient.email.trim();
      const contactName = recipient.fullName || '';

      const subject = `Коммерческое предложение по проекту ${projectId}`;

      const lines: string[] = [];
      lines.push(contactName ? `Здравствуйте ${contactName}` : 'Здравствуйте');
      lines.push('');
      lines.push('Просим вас предоставить коммерческое предложение с указанием сроков на поставку оборудования:');
      lines.push('');
      lines.push(`ID проекта: ${projectId}`);
      lines.push(`ID товара: ${itemId}`);
      lines.push(`Наименование: ${itemName}`);
      lines.push(`Количество: ${quantity}`);
      lines.push('');
      lines.push('Описание:');
      lines.push(description || '-');
      lines.push('');
      lines.push('С уважением');
      lines.push(userFullName || 'Пользователь системы');
      lines.push(mailSettings.companyName);
      lines.push(`Телефон: ${userPhone || ''}`);

      const text = lines.join('\n');

      try {
        await sendEmail({ to, subject, text });
        results.push({ email: to, status: 'ok' });
      } catch (err: any) {
        console.error('Ошибка отправки письма на адрес', to, err);
        results.push({ email: to, status: 'error', error: err?.message || 'Ошибка отправки' });
      }
    }

    const hasErrors = results.some((r) => r.status === 'error');
    res.status(hasErrors ? 207 : 200).json({ results });
  } catch (error: any) {
    console.error('Ошибка в /api/mail/send-requests:', error);
    res.status(500).json({
      error: 'Ошибка отправки почтовых сообщений',
      details: error?.message || 'Неизвестная ошибка',
    });
  }
});

export default router;



