import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import axios from 'axios';
import { load } from 'cheerio';

dotenv.config();

/**
 * Скрипт для парсинга технических характеристик с сайта по ссылкам из карточек товаров
 * Заполняет поля: Количество каналов, Шаг установки объема дозы, Точность дозирования, 
 * Воспроизводимость, Автоклавируемость
 */
async function parseProductSpecificationsFromUrl() {
  try {
    console.log('Парсинг характеристик по ссылкам из карточек товаров...\n');

    // Получаем все карточки с заполненной ссылкой на внешний ресурс
    const cardsResult = await pool.query(`
      SELECT id, name, external_url, channels_count, volume_step, dosing_accuracy, 
             reproducibility, autoclavable
      FROM equipment_cards
      WHERE external_url IS NOT NULL AND external_url != ''
      ORDER BY name
    `);

    console.log(`Найдено карточек с ссылками: ${cardsResult.rows.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < cardsResult.rows.length; i++) {
      const card = cardsResult.rows[i];
      const url = card.external_url;

      console.log(`[${i + 1}/${cardsResult.rows.length}] Обработка: ${card.name}`);
      console.log(`  URL: ${url}`);

      try {
        // Загружаем страницу товара
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          },
          timeout: 30000
        });

        const $ = load(response.data);
        const pageText = $('body').text();

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        let hasUpdates = false;

        // 1. Количество каналов
        if (!card.channels_count) {
          // Ищем в таблицах
          const channelsTable = $('td, th').filter((idx, el) => {
            const text = $(el).text().toLowerCase();
            return Boolean(text.includes('канал') && (text.includes('количество') || text.match(/\d+/)));
          }).first();

          if (channelsTable.length > 0) {
            const channelsValue = channelsTable.next().text().trim() || 
                                 channelsTable.parent().next().find('td').first().text().trim();
            const channelsMatch = channelsValue.match(/(\d+)/);
            if (channelsMatch) {
              const channels = parseInt(channelsMatch[1]);
              updates.push(`channels_count = $${paramCount}`);
              values.push(channels);
              paramCount++;
              hasUpdates = true;
              console.log(`  ✓ Количество каналов: ${channels}`);
            }
          }

          // Если не нашли в таблице, ищем в тексте
          if (!hasUpdates || !card.channels_count) {
            const channelsMatch = pageText.match(/(\d+)[-\s]?(?:канальный|тиканальный)/i);
            if (channelsMatch) {
              const channels = parseInt(channelsMatch[1]);
              if (!updates.some(u => u.includes('channels_count'))) {
                updates.push(`channels_count = $${paramCount}`);
                values.push(channels);
                paramCount++;
                hasUpdates = true;
                console.log(`  ✓ Количество каналов: ${channels}`);
              }
            }
          }
        }

        // 2. Шаг установки объема дозы
        if (!card.volume_step) {
          const stepTable = $('td, th').filter((idx, el) => {
            const text = $(el).text().toLowerCase();
            return (text.includes('шаг') && (text.includes('установки') || text.includes('объема'))) ||
                   text.includes('инкремент');
          }).first();

          if (stepTable.length > 0) {
            const stepValue = stepTable.next().text().trim() || 
                            stepTable.parent().next().find('td').first().text().trim();
            // Пропускаем значения "—", "-", пустые строки
            if (stepValue && stepValue.length < 50 && 
                !stepValue.toLowerCase().includes('шаг') && 
                stepValue !== '—' && stepValue !== '-' && stepValue.trim() !== '') {
              updates.push(`volume_step = $${paramCount}`);
              values.push(stepValue);
              paramCount++;
              hasUpdates = true;
              console.log(`  ✓ Шаг установки объема: ${stepValue}`);
            }
          }

          if (!card.volume_step) {
            const stepMatch = pageText.match(/шаг[:\s]+установки[:\s]+объема[:\s]+дозы[:\s]+([^\n]+?)(?:\n|мкл|мл|%)/i) ||
                            pageText.match(/инкремент[:\s]+([0-9,.\s]+(?:мкл|мл|%))/i);
            if (stepMatch && stepMatch[1]) {
              const stepValue = stepMatch[1].trim();
              // Пропускаем значения "—", "-", пустые строки
              if (stepValue.length < 50 && stepValue !== '—' && stepValue !== '-' && stepValue.trim() !== '') {
                updates.push(`volume_step = $${paramCount}`);
                values.push(stepValue);
                paramCount++;
                hasUpdates = true;
                console.log(`  ✓ Шаг установки объема: ${stepValue}`);
              }
            }
          }
        }

        // 3. Точность дозирования
        if (!card.dosing_accuracy) {
          const accTable = $('td, th').filter((idx, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes('точность') || text.includes('погрешность');
          }).first();

          if (accTable.length > 0) {
            const accValue = accTable.next().text().trim() || 
                           accTable.parent().next().find('td').first().text().trim();
            // Пропускаем значения "—", "-", пустые строки
            if (accValue && accValue.length < 50 && 
                !accValue.toLowerCase().includes('точность') && 
                accValue !== '—' && accValue !== '-' && accValue.trim() !== '') {
              updates.push(`dosing_accuracy = $${paramCount}`);
              values.push(accValue);
              paramCount++;
              hasUpdates = true;
              console.log(`  ✓ Точность дозирования: ${accValue}`);
            }
          }

          if (!card.dosing_accuracy) {
            const accMatch = pageText.match(/точность[:\s]+дозирования[:\s]+([^\n]+?)(?:\n|%)/i) ||
                            pageText.match(/погрешность[:\s]+([0-9,.\s]+%)/i);
            if (accMatch && accMatch[1]) {
              const accValue = accMatch[1].trim();
              // Пропускаем значения "—", "-", пустые строки
              if (accValue.length < 50 && accValue !== '—' && accValue !== '-' && accValue.trim() !== '') {
                updates.push(`dosing_accuracy = $${paramCount}`);
                values.push(accValue);
                paramCount++;
                hasUpdates = true;
                console.log(`  ✓ Точность дозирования: ${accValue}`);
              }
            }
          }
        }

        // 4. Воспроизводимость
        if (!card.reproducibility) {
          const repTable = $('td, th').filter((idx, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes('воспроизводимость') || text.includes('cv');
          }).first();

          if (repTable.length > 0) {
            const repValue = repTable.next().text().trim() || 
                           repTable.parent().next().find('td').first().text().trim();
            // Пропускаем значения "—", "-", пустые строки
            if (repValue && repValue.length < 50 && 
                repValue !== '—' && repValue !== '-' && repValue.trim() !== '' &&
                !repValue.toLowerCase().includes('воспроизводимость')) {
              updates.push(`reproducibility = $${paramCount}`);
              values.push(repValue);
              paramCount++;
              hasUpdates = true;
              console.log(`  ✓ Воспроизводимость: ${repValue}`);
            }
          }

          if (!card.reproducibility) {
            const repMatch = pageText.match(/воспроизводимость[:\s]+([^\n]+?)(?:\n|%)/i) ||
                            pageText.match(/CV[:\s]+([0-9,.\s]+%)/i);
            if (repMatch && repMatch[1]) {
              const repValue = repMatch[1].trim();
              // Пропускаем значения "—", "-", пустые строки
              if (repValue.length < 50 && repValue !== '—' && repValue !== '-' && repValue.trim() !== '') {
                updates.push(`reproducibility = $${paramCount}`);
                values.push(repValue);
                paramCount++;
                hasUpdates = true;
                console.log(`  ✓ Воспроизводимость: ${repValue}`);
              }
            }
          }
        }

        // 5. Автоклавируемость
        if (card.autoclavable === null || card.autoclavable === undefined) {
          const autTable = $('td, th').filter((idx, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes('автоклав');
          }).first();

          if (autTable.length > 0) {
            const autValue = autTable.next().text().trim().toLowerCase() || 
                           autTable.parent().next().find('td').first().text().trim().toLowerCase();
            const isAutoclavable = autValue.includes('да') || autValue.includes('yes') || 
                                  autValue.includes('+') || autValue === '1';
            updates.push(`autoclavable = $${paramCount}`);
            values.push(isAutoclavable);
            paramCount++;
            hasUpdates = true;
            console.log(`  ✓ Автоклавируемость: ${isAutoclavable ? 'Да' : 'Нет'}`);
          } else {
            // Ищем в тексте
            const autMatch = pageText.match(/автоклав/i) || pageText.match(/autoclavable/i);
            if (autMatch) {
              updates.push(`autoclavable = $${paramCount}`);
              values.push(true);
              paramCount++;
              hasUpdates = true;
              console.log(`  ✓ Автоклавируемость: Да`);
            }
          }
        }

        // Обновляем карточку, если есть изменения
        if (hasUpdates && updates.length > 0) {
          values.push(card.id);
          await pool.query(`
            UPDATE equipment_cards
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
          `, values);
          updatedCount++;
          console.log(`  ✅ Карточка обновлена\n`);
        } else {
          skippedCount++;
          console.log(`  ⚠ Данные не найдены или уже заполнены\n`);
        }

        // Задержка между запросами, чтобы не перегружать сервер
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        errorCount++;
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.log(`  ❌ Ошибка подключения к сайту: ${error.message}\n`);
        } else if (error.response && error.response.status === 404) {
          console.log(`  ❌ Страница не найдена (404)\n`);
        } else {
          console.log(`  ❌ Ошибка: ${error.message}\n`);
        }
      }
    }

    console.log(`\n✅ Парсинг завершен!`);
    console.log(`📊 Статистика:`);
    console.log(`   Всего карточек обработано: ${cardsResult.rows.length}`);
    console.log(`   Обновлено: ${updatedCount}`);
    console.log(`   Пропущено (данные не найдены или уже заполнены): ${skippedCount}`);
    console.log(`   Ошибок: ${errorCount}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

parseProductSpecificationsFromUrl();

