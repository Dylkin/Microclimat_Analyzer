import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

/**
 * Скрипт для обработки поля "Серия":
 * 1. Находит одно из значений: HiPette, MicroPette Plus или TopPette
 * 2. Удаляет все символы до этого значения, оставляя только название серии
 * 3. Символы после названия серии переносит в поле "Объем дозирования"
 */
async function processProductSeries() {
  try {
    console.log('Обработка поля "Серия" для всех карточек товаров...\n');

    // Получаем все карточки с заполненным полем series
    const result = await pool.query(`
      SELECT id, name, series, dosing_volume
      FROM equipment_cards
      WHERE series IS NOT NULL AND series != ''
      ORDER BY name
    `);

    console.log(`Найдено карточек с заполненной серией: ${result.rows.length}\n`);

    let updatedCount = 0;

    for (const card of result.rows) {
      const originalSeries = card.series;
      let newSeries = originalSeries;
      let dosingVolume = card.dosing_volume || '';

      // Ищем одно из значений: HiPette, MicroPette Plus или TopPette
      const seriesPatterns = [
        { name: 'MicroPette Plus', pattern: /MicroPette\s+Plus/i },
        { name: 'HiPette', pattern: /HiPette/i },
        { name: 'TopPette', pattern: /TopPette/i }
      ];

      let foundSeries: { name: string; index: number } | null = null;

      for (const seriesPattern of seriesPatterns) {
        const match = originalSeries.match(seriesPattern.pattern);
        if (match && match.index !== undefined) {
          foundSeries = {
            name: seriesPattern.name,
            index: match.index
          };
          break;
        }
      }

      if (foundSeries) {
        // Находим позицию начала серии
        const seriesStartIndex = foundSeries.index;
        
        // Находим позицию конца серии (после названия серии)
        const seriesEndIndex = seriesStartIndex + foundSeries.name.length;
        
        // Извлекаем название серии (нормализуем регистр)
        newSeries = foundSeries.name;
        
        // Извлекаем текст после названия серии
        const textAfterSeries = originalSeries.substring(seriesEndIndex).trim();
        
        // Если после серии есть текст и поле "Объем дозирования" пустое или отличается
        if (textAfterSeries && textAfterSeries.length > 0) {
          // Проверяем, содержит ли текст после серии информацию об объеме
          // (обычно это числа с единицами измерения: мкл, мл и т.д.)
          const volumePattern = /(\d+[.,]\d+|\d+)[-\s]+(\d+[.,]\d+|\d+)\s*(мкл|мл|µl|ml)/i;
          const volumeMatch = textAfterSeries.match(volumePattern);
          
          if (volumeMatch) {
            // Если найден паттерн объема, используем его
            const volumeFrom = volumeMatch[1].replace(',', '.');
            const volumeTo = volumeMatch[2].replace(',', '.');
            const unit = volumeMatch[3].toLowerCase();
            dosingVolume = `${volumeFrom}-${volumeTo} ${unit === 'мкл' || unit === 'µl' ? 'мкл' : 'мл'}`;
          } else {
            // Иначе берем весь текст после серии (но ограничиваем длину)
            dosingVolume = textAfterSeries.substring(0, 100);
          }
        }

        // Обновляем карточку только если что-то изменилось
        if (newSeries !== originalSeries || dosingVolume !== (card.dosing_volume || '')) {
          await pool.query(`
            UPDATE equipment_cards
            SET series = $1, dosing_volume = $2, updated_at = NOW()
            WHERE id = $3
          `, [newSeries, dosingVolume || null, card.id]);

          updatedCount++;
          console.log(`✓ Обновлена карточка: ${card.name}`);
          console.log(`  Серия: "${originalSeries}" -> "${newSeries}"`);
          if (dosingVolume) {
            console.log(`  Объем дозирования: "${card.dosing_volume || '(пусто)'}" -> "${dosingVolume}"`);
          }
          console.log('');
        }
      } else {
        // Если не найдена серия, но есть текст, который может быть серией
        console.log(`⚠ Не найдена известная серия в карточке: ${card.name}`);
        console.log(`  Текущая серия: "${originalSeries}"\n`);
      }
    }

    console.log(`\n✅ Обработка завершена!`);
    console.log(`Обновлено карточек: ${updatedCount} из ${result.rows.length}`);

    // Статистика
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN series IN ('HiPette', 'MicroPette Plus', 'TopPette') THEN 1 END) as normalized_count,
        COUNT(CASE WHEN dosing_volume IS NOT NULL AND dosing_volume != '' THEN 1 END) as with_volume_count
      FROM equipment_cards
      WHERE series IS NOT NULL AND series != ''
    `);

    const stats = statsResult.rows[0];
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего карточек с серией: ${stats.total}`);
    console.log(`   С нормализованной серией: ${stats.normalized_count}`);
    console.log(`   С заполненным объемом дозирования: ${stats.with_volume_count}`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

processProductSeries();



