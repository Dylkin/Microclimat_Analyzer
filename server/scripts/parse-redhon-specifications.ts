import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import axios from 'axios';
import { load } from 'cheerio';

dotenv.config();

/**
 * Скрипт для парсинга технических характеристик с сайта redhon.ru
 * Заполняет поля: Шаг установки объема дозы, Точность дозирования, Воспроизводимость, Автоклавируемость
 */
async function parseRedhonSpecifications() {
  try {
    console.log('Начало парсинга характеристик с redhon.ru...\n');

    const url = 'https://redhon.ru/catalog/dozatory_i_pipetki/filter/in_stock-is-y/shee_22-is-hipette/apply/';
    
    console.log(`Парсинг страницы: ${url}`);
    
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
    const products: Array<{
      name: string;
      volumeStep?: string;
      dosingAccuracy?: string;
      reproducibility?: string;
      autoclavable?: boolean;
      link?: string;
    }> = [];

    console.log('Поиск товаров на странице...');

    // Ищем элементы товаров
    const items = $('.item');
    console.log(`Найдено элементов: ${items.length}`);

    items.each((index, element) => {
      const $el = $(element);
      
      // Получаем название товара
      const nameLink = $el.find('a').first();
      const name = nameLink.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                  nameLink.text().trim() ||
                  $el.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                  $el.text().trim().split('\n')[0].trim();

      // Получаем ссылку на товар
      const link = nameLink.attr('href') ||
                  $el.find('a[href*="/catalog/"]').first().attr('href') ||
                  $el.attr('href');

      if (!name || name.length < 5) return;

      // Получаем ссылку на страницу товара для детального парсинга
      const productLink = link ? (link.startsWith('http') ? link : `https://redhon.ru${link}`) : undefined;
      
      // Ищем характеристики в тексте карточки
      const cardText = $el.text();
      
      // Шаг установки объема дозы
      const volumeStepMatch = cardText.match(/шаг[:\s]+([^\n]+)/i) || 
                             cardText.match(/шаг установки[:\s]+([^\n]+)/i) ||
                             cardText.match(/инкремент[:\s]+([^\n]+)/i);
      
      // Точность дозирования
      const accuracyMatch = cardText.match(/точность[:\s]+([^\n]+)/i) ||
                           cardText.match(/accuracy[:\s]+([^\n]+)/i) ||
                           cardText.match(/погрешность[:\s]+([^\n]+)/i);
      
      // Воспроизводимость
      const reproducibilityMatch = cardText.match(/воспроизводимость[:\s]+([^\n]+)/i) ||
                                 cardText.match(/reproducibility[:\s]+([^\n]+)/i) ||
                                 cardText.match(/CV[:\s]+([^\n]+)/i);
      
      // Автоклавируемость
      const autoclavableMatch = cardText.match(/автоклав/i) ||
                               cardText.match(/autoclavable/i) ||
                               cardText.match(/автоклавирование/i);

      const product: typeof products[0] = {
        name: name.substring(0, 200),
        link: productLink
      };

      if (volumeStepMatch) {
        product.volumeStep = volumeStepMatch[1].trim().substring(0, 100);
      }
      if (accuracyMatch) {
        product.dosingAccuracy = accuracyMatch[1].trim().substring(0, 100);
      }
      if (reproducibilityMatch) {
        product.reproducibility = reproducibilityMatch[1].trim().substring(0, 100);
      }
      if (autoclavableMatch) {
        product.autoclavable = true;
      }

      products.push(product);
    });

    console.log(`\nНайдено товаров: ${products.length}`);
    console.log('Парсинг детальных страниц товаров...\n');

    // Парсим детальные страницы товаров для получения характеристик
    for (let i = 0; i < Math.min(products.length, 20); i++) { // Ограничиваем до 20 товаров для теста
      const product = products[i];
      if (!product.link) continue;

      try {
        console.log(`Парсинг страницы товара ${i + 1}/${Math.min(products.length, 20)}: ${product.name}`);
        
        const detailResponse = await axios.get(product.link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9',
          },
          timeout: 15000
        });

        const $detail = load(detailResponse.data);
        const detailText = $detail.text();

        // Ищем характеристики в таблицах или тексте страницы
        // Шаг установки объема дозы
        if (!product.volumeStep) {
          // Пробуем найти в таблице
          const stepTable = $detail('td, th').filter((i, el) => {
            const text = $detail(el).text().toLowerCase();
            return text.includes('шаг') && (text.includes('установки') || text.includes('объема'));
          }).first();
          
          if (stepTable.length > 0) {
            const stepValue = stepTable.next().text().trim() || stepTable.parent().next().find('td').first().text().trim();
            if (stepValue && stepValue.length < 50 && !stepValue.toLowerCase().includes('шаг')) {
              product.volumeStep = stepValue;
            }
          }
          
          // Если не нашли в таблице, ищем в тексте
          if (!product.volumeStep) {
            const stepMatch = detailText.match(/шаг[:\s]+установки[:\s]+объема[:\s]+дозы[:\s]+([^\n]+?)(?:\n|мкл|мл|%)/i) ||
                            detailText.match(/инкремент[:\s]+([0-9,.\s]+(?:мкл|мл|%))/i);
            if (stepMatch && stepMatch[1]) {
              const stepValue = stepMatch[1].trim();
              if (stepValue.length < 50) {
                product.volumeStep = stepValue;
              }
            }
          }
        }

        // Точность дозирования
        if (!product.dosingAccuracy) {
          // Пробуем найти в таблице
          const accTable = $detail('td, th').filter((i, el) => {
            const text = $detail(el).text().toLowerCase();
            return text.includes('точность') || text.includes('погрешность');
          }).first();
          
          if (accTable.length > 0) {
            const accValue = accTable.next().text().trim() || accTable.parent().next().find('td').first().text().trim();
            if (accValue && accValue.length < 50 && !accValue.toLowerCase().includes('точность')) {
              product.dosingAccuracy = accValue;
            }
          }
          
          // Если не нашли в таблице, ищем в тексте
          if (!product.dosingAccuracy) {
            const accMatch = detailText.match(/точность[:\s]+дозирования[:\s]+([^\n]+?)(?:\n|%)/i) ||
                            detailText.match(/погрешность[:\s]+([0-9,.\s]+%)/i);
            if (accMatch && accMatch[1]) {
              const accValue = accMatch[1].trim();
              if (accValue.length < 50) {
                product.dosingAccuracy = accValue;
              }
            }
          }
        }

        // Воспроизводимость
        if (!product.reproducibility) {
          // Пробуем найти в таблице
          const repTable = $detail('td, th').filter((i, el) => {
            const text = $detail(el).text().toLowerCase();
            return text.includes('воспроизводимость') || text.includes('cv');
          }).first();
          
          if (repTable.length > 0) {
            const repValue = repTable.next().text().trim() || repTable.parent().next().find('td').first().text().trim();
            if (repValue && repValue.length < 50 && repValue !== '—' && !repValue.toLowerCase().includes('воспроизводимость')) {
              product.reproducibility = repValue;
            }
          }
          
          // Если не нашли в таблице, ищем в тексте
          if (!product.reproducibility) {
            const repMatch = detailText.match(/воспроизводимость[:\s]+([^\n]+?)(?:\n|%)/i) ||
                            detailText.match(/CV[:\s]+([0-9,.\s]+%)/i);
            if (repMatch && repMatch[1]) {
              const repValue = repMatch[1].trim();
              if (repValue.length < 50 && repValue !== '—') {
                product.reproducibility = repValue;
              }
            }
          }
        }

        // Автоклавируемость
        if (product.autoclavable === undefined) {
          const autMatch = detailText.match(/автоклав/i) ||
                          detailText.match(/autoclavable/i);
          if (autMatch) {
            product.autoclavable = true;
          }
        }

        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.log(`⚠ Ошибка парсинга страницы ${product.name}: ${error.message}`);
      }
    }

    // Получаем все карточки из базы для сопоставления
    const cardsResult = await pool.query(`
      SELECT id, name, series, channels_count, dosing_volume
      FROM equipment_cards
      WHERE series ILIKE '%hipette%' OR series ILIKE '%micro%' OR series ILIKE '%top%'
    `);

    console.log(`\nНайдено карточек в БД для обновления: ${cardsResult.rows.length}`);

    // Обновляем карточки в базе данных
    let updatedCount = 0;
    let matchedCount = 0;

    for (const product of products) {
      // Ищем карточку по различным критериям
      let matchedCard: any = null;

      // Попытка 1: Точное совпадение наименования
      matchedCard = cardsResult.rows.find((card: any) => 
        card.name.toLowerCase() === product.name.toLowerCase()
      );

      // Попытка 2: Частичное совпадение (если содержит ключевые слова)
      if (!matchedCard) {
        const productKeywords = product.name.toLowerCase()
          .replace(/дозатор\s+dlab\s+/gi, '')
          .replace(/1-канальный|8-канальный|12-канальный|12-тиканальный/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 3);

        matchedCard = cardsResult.rows.find((card: any) => {
          const cardNameLower = card.name.toLowerCase();
          return productKeywords.some((keyword: string) => cardNameLower.includes(keyword));
        });
      }

      // Попытка 3: По серии и объему дозирования
      if (!matchedCard && product.name.match(/hipette/i)) {
        const volumeMatch = product.name.match(/(\d+[.,]\d+|\d+)[-\s]+(\d+[.,]\d+|\d+)\s*(мкл|мл)/i);
        if (volumeMatch) {
          matchedCard = cardsResult.rows.find((card: any) => {
            const cardSeries = (card.series || '').toLowerCase();
            const cardVolume = (card.dosing_volume || '').toLowerCase();
            return cardSeries.includes('hipette') && cardVolume.includes(volumeMatch[3].toLowerCase());
          });
        }
      }

      if (matchedCard) {
        matchedCount++;
        const cardId = matchedCard.id;
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (product.volumeStep) {
          updates.push(`volume_step = $${paramCount}`);
          values.push(product.volumeStep);
          paramCount++;
        }
        if (product.dosingAccuracy) {
          updates.push(`dosing_accuracy = $${paramCount}`);
          values.push(product.dosingAccuracy);
          paramCount++;
        }
        if (product.reproducibility) {
          updates.push(`reproducibility = $${paramCount}`);
          values.push(product.reproducibility);
          paramCount++;
        }
        if (product.autoclavable !== undefined) {
          updates.push(`autoclavable = $${paramCount}`);
          values.push(product.autoclavable);
          paramCount++;
        }

        if (updates.length > 0) {
          values.push(cardId);
          await pool.query(
            `UPDATE equipment_cards SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
            values
          );
          updatedCount++;
          console.log(`✓ Обновлена карточка: ${matchedCard.name}`);
          if (product.volumeStep) console.log(`  - Шаг установки объема: ${product.volumeStep}`);
          if (product.dosingAccuracy) console.log(`  - Точность: ${product.dosingAccuracy}`);
          if (product.reproducibility) console.log(`  - Воспроизводимость: ${product.reproducibility}`);
          if (product.autoclavable) console.log(`  - Автоклавируемость: Да`);
        } else {
          console.log(`⚠ Карточка найдена, но нет данных для обновления: ${matchedCard.name}`);
        }
      } else {
        // Логируем несовпавшие товары для отладки
        if (products.indexOf(product) < 5) {
          console.log(`⚠ Не найдена карточка для: ${product.name}`);
        }
      }
    }

    console.log(`\nНайдено совпадений: ${matchedCount} из ${products.length}`);

    console.log(`\n✅ Парсинг завершен!`);
    console.log(`Обновлено карточек: ${updatedCount} из ${products.length}`);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('Не удалось подключиться к сайту.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

parseRedhonSpecifications();

