import { ImapFlow } from 'imapflow';
import { mailSettings } from './mailSettings.js';
import { pool } from '../config/database.js';

export interface EmailMessage {
  id: string;
  contactId: string | null;
  fromEmail: string;
  subject: string | null;
  body: string | null;
  receivedAt: Date;
}

async function ensureImapClient() {
  if (!mailSettings.imapHost || !mailSettings.imapUser || !mailSettings.imapPassword) {
    throw new Error(
      'Не настроены параметры IMAP (MAIL_IMAP_HOST / MAIL_IMAP_USER / MAIL_IMAP_PASSWORD или соответствующие поля настроек почты)'
    );
  }

  const client = new ImapFlow({
    host: mailSettings.imapHost,
    port: mailSettings.imapPort,
    secure: mailSettings.imapSecure,
    auth: {
      user: mailSettings.imapUser,
      pass: mailSettings.imapPassword,
    },
  });

  await client.connect();
  return client;
}

async function upsertEmailMessage(
  contactId: string | null,
  fromEmail: string,
  subject: string | null,
  body: string | null,
  receivedAt: Date,
  externalId: string | null
): Promise<void> {
  await pool.query(
    `
      INSERT INTO email_messages (contact_id, from_email, subject, body, received_at, external_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (external_id) DO UPDATE
      SET subject = EXCLUDED.subject,
          body = EXCLUDED.body,
          received_at = EXCLUDED.received_at
    `,
    [contactId, fromEmail, subject, body, receivedAt, externalId]
  );
}

async function findContactIdByEmail(email: string): Promise<string | null> {
  const res = await pool.query(
    'SELECT id FROM contractor_contacts WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].id as string;
}

export async function syncEmailsForContactEmail(
  contactEmail: string,
  limit: number = 50
): Promise<EmailMessage[]> {
  const client = await ensureImapClient();

  try {
    // Открываем INBOX
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages: EmailMessage[] = [];

      // Ищем письма с указанного адреса
      const searchCriteria = {
        from: contactEmail,
      } as any;

      const sequence = await client.search(searchCriteria, {
        uid: true,
      });

      // Берём только последние limit сообщений
      const lastUids = sequence.slice(-limit);

      if (lastUids.length === 0) {
        return [];
      }

      const contactId = await findContactIdByEmail(contactEmail);

      for await (const msg of client.fetch(lastUids, {
        envelope: true,
        source: false,
        bodyStructure: true,
        bodyParts: ['text'],
        internalDate: true,
        uid: true,
      }) as any) {
        const uid = msg.uid as number;
        const envelope = msg.envelope;
        const subject = (envelope?.subject as string) || null;
        const receivedAt = msg.internalDate ? new Date(msg.internalDate) : new Date();

        // Получаем текстовое содержимое письма
        let textBody: string | null = null;
        try {
          const { text } = await client.download(uid, undefined, {
            uid: true,
          }) as any;
          textBody = text || null;
        } catch {
          textBody = null;
        }

        const externalId = String(uid);

        await upsertEmailMessage(
          contactId,
          contactEmail,
          subject,
          textBody,
          receivedAt,
          externalId
        );

        messages.push({
          id: externalId,
          contactId,
          fromEmail: contactEmail,
          subject,
          body: textBody,
          receivedAt,
        });
      }

      // Сортируем по дате по убыванию
      messages.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function getStoredEmailsByContactId(
  contactId: string,
  limit: number = 20
): Promise<EmailMessage[]> {
  const res = await pool.query(
    `
      SELECT id, contact_id, from_email, subject, body, received_at
      FROM email_messages
      WHERE contact_id = $1
      ORDER BY received_at DESC
      LIMIT $2
    `,
    [contactId, limit]
  );

  return res.rows.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    fromEmail: row.from_email,
    subject: row.subject,
    body: row.body,
    receivedAt: row.received_at,
  }));
}


