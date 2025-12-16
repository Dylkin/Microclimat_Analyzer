import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

/**
 * Скрипт для заполнения данных карточек товаров:
 * 1. Заменяет все значения в поле Производитель на DLAB
 * 2. Извлекает из Наименования серию (HiPette, MicroPette Plus, TopPette) и добавляет в поле Серия
 * 3. Извлекает количество каналов из Наименования и добавляет в поле Количество каналов
 * 4. Извлекает объем дозирования из Наименования и добавляет в поле Объем дозирования
 */
async function fillProductCardData() {
  try {
    console.log('Начало заполнения данных карточек товаров...\n');

    // Получаем все карточки
    const result = await pool.query(`
      SELECT id, name, manufacturer, series, channels_count, dosing_volume
      FROM equipment_cards
      ORDER BY name
    `);

    console.log(`Найдено карточек: ${result.rows.length}\n`);

    let updatedCount = 0;

    for (const card of result.rows) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // 1. Устанавливаем производителя в DLAB
      updates.push(`manufacturer = $${paramCount}`);
      values.push('DLAB');
      paramCount++;

      // 2. Извлекаем серию из наименования
      const seriesMatch = card.name.match(/(HiPette|MicroPette Plus|TopPette)/i);
      if (seriesMatch) {
        const series = seriesMatch[1];
        // Нормализуем название серии
        let normalizedSeries = series;
        if (series.toLowerCase().includes('hi')) {
          normalizedSeries = 'HiPette';
        } else if (series.toLowerCase().includes('micro')) {
          normalizedSeries = 'MicroPette Plus';
        } else if (series.toLowerCase().includes('top')) {
          normalizedSeries = 'TopPette';
        }
        
        if (card.series !== normalizedSeries) {
          updates.push(`series = $${paramCount}`);
          values.push(normalizedSeries);
          paramCount++;
          console.log(`  ${card.name}: Серия -> ${normalizedSeries}`);
        }
      }

      // 3. Извлекаем количество каналов из наименования
      // Ищем паттерны типа "1-канальный", "8-канальный", "12-канальный", "12-тиканальный"
      const channelsMatch = card.name.match(/(\d+)[-\s]?(?:канальный|тиканальный)/i);
      if (channelsMatch) {
        const channels = parseInt(channelsMatch[1]);
        if (card.channels_count !== channels) {
          updates.push(`channels_count = $${paramCount}`);
          values.push(channels);
          paramCount++;
          console.log(`  ${card.name}: Количество каналов -> ${channels}`);
        }
      }

      // 4. Извлекаем объем дозирования из наименования
      // Ищем паттерны типа "0,1-2,5 мкл", "5-50 мкл", "100-1000 мкл", "2-10 мл"
      const volumeMatch = card.name.match(/(\d+[.,]\d+|\d+)[-\s]+(\d+[.,]\d+|\d+)\s*(мкл|мл|µl|ml)/i);
      if (volumeMatch) {
        const volumeFrom = volumeMatch[1].replace(',', '.');
        const volumeTo = volumeMatch[2].replace(',', '.');
        const unit = volumeMatch[3].toLowerCase();
        const dosingVolume = `${volumeFrom}-${volumeTo} ${unit === 'мкл' || unit === 'µl' ? 'мкл' : 'мл'}`;
        
        if (card.dosing_volume !== dosingVolume) {
          updates.push(`dosing_volume = $${paramCount}`);
          values.push(dosingVolume);
          paramCount++;
          console.log(`  ${card.name}: Объем дозирования -> ${dosingVolume}`);
        }
      }

      // Обновляем карточку, если есть изменения
      if (updates.length > 0) {
        values.push(card.id);
        const updateQuery = `
          UPDATE equipment_cards
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
        `;
        
        await pool.query(updateQuery, values);
        updatedCount++;
        console.log(`  ✓ Обновлена карточка: ${card.name}\n`);
      }
    }

    console.log(`\n✅ Обработка завершена!`);
    console.log(`Обновлено карточек: ${updatedCount} из ${result.rows.length}`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fillProductCardData();



