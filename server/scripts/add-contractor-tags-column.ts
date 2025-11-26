import { pool } from '../config/database.js';

async function addContractorTagsColumn() {
  try {
    console.log('🔄 Добавление колонки "tags" в таблицу contractors (если её ещё нет)...');

    const sql = `
      ALTER TABLE public.contractors
      ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
    `;

    await pool.query(sql);

    console.log('✅ Колонка "tags" успешно добавлена (или уже существовала)');
  } catch (error: any) {
    console.error('❌ Ошибка при добавлении колонки tags в contractors:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addContractorTagsColumn();


