import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSave() {
  try {
    console.log('Тестирование сохранения настроек...');
    
    const userId = '4ddace07-1e3a-5ff9-ac81-0183d0e34403'; // ID пользователя по умолчанию (UUID v5)
    const purchaseItems = ['Тестовый предмет'];
    const organizationUnps = ['123456789'];
    
    console.log('Данные для сохранения:', { userId, purchaseItems, organizationUnps });
    
    // Проверяем, есть ли уже настройки
    const existing = await pool.query(
      'SELECT id FROM tender_search_settings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    
    console.log('Существующие настройки:', existing.rows.length);
    
    let result;
    if (existing.rows.length > 0) {
      console.log('Обновление существующих настроек...');
      result = await pool.query(
        `UPDATE tender_search_settings 
         SET purchase_items = $1, organization_unps = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, user_id, purchase_items, organization_unps, created_at, updated_at`,
        [purchaseItems, organizationUnps, existing.rows[0].id]
      );
    } else {
      console.log('Создание новых настроек...');
      result = await pool.query(
        `INSERT INTO tender_search_settings (user_id, purchase_items, organization_unps)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, purchase_items, organization_unps, created_at, updated_at`,
        [userId, purchaseItems, organizationUnps]
      );
    }
    
    console.log('✅ Настройки успешно сохранены:', result.rows[0]);
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    await pool.end();
    process.exit(1);
  }
}

testSave();


