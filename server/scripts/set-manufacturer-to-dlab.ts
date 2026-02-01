import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

/**
 * Скрипт для замены всех значений в поле "Производитель" на "DLAB"
 */
async function setManufacturerToDLAB() {
  try {
    console.log('Замена производителя на DLAB для всех карточек товаров...\n');

    // Обновляем все карточки
    const result = await pool.query(`
      UPDATE equipment_cards
      SET manufacturer = 'DLAB', updated_at = NOW()
      WHERE manufacturer IS NULL OR manufacturer != 'DLAB'
      RETURNING id, name, manufacturer
    `);

    console.log(`✅ Обновлено карточек: ${result.rows.length}`);

    if (result.rows.length > 0) {
      console.log('\nОбновленные карточки:');
      result.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.name} -> Производитель: ${row.manufacturer}`);
      });
    }

    // Проверяем результат
    const checkResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN manufacturer = 'DLAB' THEN 1 END) as dlab_count,
             COUNT(CASE WHEN manufacturer IS NULL OR manufacturer != 'DLAB' THEN 1 END) as other_count
      FROM equipment_cards
    `);

    const stats = checkResult.rows[0];
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего карточек: ${stats.total}`);
    console.log(`   С производителем DLAB: ${stats.dlab_count}`);
    console.log(`   С другим производителем: ${stats.other_count}`);

    console.log('\n✅ Процесс завершен!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setManufacturerToDLAB();



