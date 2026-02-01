import { pool } from '../config/database.js';

async function createEmailMessagesTable() {
  try {
    console.log('Creating table email_messages if not exists...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id uuid REFERENCES contractor_contacts(id) ON DELETE SET NULL,
        from_email text NOT NULL,
        subject text,
        body text,
        received_at timestamptz NOT NULL DEFAULT now(),
        external_id text
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS email_messages_contact_id_idx ON email_messages(contact_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS email_messages_from_email_idx ON email_messages(from_email);
    `);

    console.log('Table email_messages ensured.');
  } catch (error) {
    console.error('Error creating email_messages table:', error);
  } finally {
    await pool.end();
  }
}

createEmailMessagesTable().catch((err) => {
  console.error('Unhandled error in createEmailMessagesTable:', err);
});


