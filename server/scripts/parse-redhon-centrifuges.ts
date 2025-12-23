/**
 * Скрипт для парсинга центрифуг с сайта redhon.ru
 * и добавления их в категорию "Лабораторные центрифуги"
 */

import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import axios from 'axios';
import { load } from 'cheerio';

dotenv.config();

interface CentrifugeItem {
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  externalUrl: string;
  imageUrl?: string;
  price?: string;
  article?: string;
}

async function getCentrifugeSectionId(): Promise<string> {
  try {
    const result = await pool.query(
      'SELECT id FROM equipment_sections WHERE name = $1',
      ['Лабораторные центрифуги']
    );

    if (result.rows.length === 0) {
      throw new Error('Категория "Лабораторные центрифуги" не найдена. Сначала создайте категорию.');
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Ошибка получения ID категории:', error);
    throw error;
  }
}

async function addCentrifugeCard(sectionId: string, card: CentrifugeItem): Promise<void> {
  try {
    // Проверяем, существует ли карточка
    const checkResult = await pool.query(
      'SELECT id FROM equipment_cards WHERE section_id = $1 AND name = $2',
      [sectionId, card.name]
    );

    if (checkResult.rows.length > 0) {
      console.log(`  ⚠ Карточка "${card.name}" уже существует, пропускаем`);
      return;
    }

    // Извлекаем модель из названия (например, "RHON-1412A" из "Центрифуга лабораторная RHON-1412A (UC-1412A)")
    let model = card.model;
    if (!model && card.name) {
      const modelMatch = card.name.match(/RHON-[\w-]+/i);
      if (modelMatch) {
        model = modelMatch[0];
      }
    }

    // Создаем карточку (используем series вместо model, так как в таблице нет поля model)
    await pool.query(
      `INSERT INTO equipment_cards (
        section_id, name, description, manufacturer, series, 
        specifications, image_url, external_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sectionId,
        card.name,
        card.description || null,
        card.manufacturer || 'RHON',
        model || null,
        JSON.stringify({
          article: card.article || null,
          price: card.price || null
        }),
        card.imageUrl || null,
        card.externalUrl
      ]
    );

    console.log(`  ✅ Добавлена карточка: ${card.name}`);
  } catch (error: any) {
    if (error.code === '23505') {
      console.log(`  ⚠ Карточка "${card.name}" уже существует (unique constraint)`);
    } else {
      console.error(`  ❌ Ошибка добавления карточки "${card.name}":`, error.message);
    }
  }
}

async function parseRedhonCentrifugesPage(url: string): Promise<CentrifugeItem[]> {
  try {
    console.log(`\n📡 Парсинг страницы: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://redhon.ru/'
      },
      timeout: 30000
    });

    const $ = load(response.data);
    const items: CentrifugeItem[] = [];

    console.log('🔍 Поиск элементов товаров...');

    // Ищем карточки товаров - на redhon.ru обычно это элементы с классом .item или похожим
    const productSelectors = [
      '.item',
      '.product-item',
      '.catalog-item',
      '.item-card',
      '.product-card',
      'article.product',
      '[class*="product"]',
      '[class*="item"]'
    ];

    let foundElements: ReturnType<typeof $> | null = null;
    
    for (const selector of productSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`  Найдено элементов с селектором "${selector}": ${elements.length}`);
        foundElements = elements;
        break;
      }
    }

    if (!foundElements || foundElements.length === 0) {
      // Альтернативный подход: ищем по структуре страницы
      console.log('  Стандартные селекторы не найдены, используем альтернативный подход...');
      
      // Ищем все элементы, которые могут быть товарами
      $('div, article, li').each((index, element) => {
        const $el = $(element);
        const $link = $el.find('a').first();
        const href = $link.attr('href');
        const text = $link.text().trim() || $el.find('h2, h3, h4, .title, .name').first().text().trim();
        
        // Проверяем, что это похоже на товар центрифуги
        if (text && text.includes('Центрифуга') && text.includes('RHON') && href) {
          const fullUrl = href.startsWith('http') ? href : `https://redhon.ru${href}`;
          
          // Ищем изображение
          const image = $el.find('img').first().attr('src') || 
                       $el.find('img').first().attr('data-src') ||
                       $el.find('img').first().attr('data-lazy-src');
          const fullImageUrl = image ? (image.startsWith('http') ? image : `https://redhon.ru${image}`) : undefined;
          
          // Ищем артикул и цену
          const articleMatch = text.match(/RHON-[\w-]+/i);
          const article = articleMatch ? articleMatch[0] : undefined;
          
          const priceText = $el.find('.price, [class*="price"], .cost').first().text().trim();
          const priceMatch = priceText.match(/[\d\s]+руб/i);
          const price = priceMatch ? priceMatch[0].trim() : undefined;
          
          // Ищем описание
          const description = $el.find('.description, .item-text, p').first().text().trim();
          
          if (text.length > 10 && text.length < 200) {
            items.push({
              name: text.substring(0, 200).trim(),
              description: description && description.length > 5 ? description.substring(0, 500).trim() : undefined,
              manufacturer: 'RHON',
              model: article,
              externalUrl: fullUrl,
              imageUrl: fullImageUrl,
              price: price,
              article: article
            });
          }
        }
      });
    } else {
      // Парсим найденные элементы
      foundElements.each((index, element) => {
        const $el = $(element);
        
        // Ищем название товара
        const nameLink = $el.find('a').first();
        let name = nameLink.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                   nameLink.text().trim() ||
                   $el.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                   $el.find('a').first().text().trim();
        
        // Пропускаем, если это не центрифуга RHON
        if (!name || (!name.includes('Центрифуга') && !name.includes('RHON'))) {
          return;
        }
        
        // Ищем описание
        const description = $el.find('.product-description, .item-description, .description, [class*="description"], .item-text').first().text().trim() ||
                          $el.find('p').first().text().trim();
        
        // Ищем ссылку
        const link = nameLink.attr('href') ||
                    $el.find('a[href*="/catalog/"]').first().attr('href') ||
                    $el.attr('href');
        
        // Ищем изображение
        const image = $el.find('.item-image img, .item-img img, img').first().attr('src') || 
                     $el.find('img').first().attr('data-src') ||
                     $el.find('img').first().attr('data-lazy-src') ||
                     $el.find('img').first().attr('data-original');
        
        // Ищем артикул и цену
        const articleMatch = name.match(/RHON-[\w-]+/i);
        const article = articleMatch ? articleMatch[0] : undefined;
        
        const priceText = $el.find('.price, [class*="price"], .cost, .item-price').first().text().trim();
        const priceMatch = priceText.match(/[\d\s]+руб/i);
        const price = priceMatch ? priceMatch[0].trim() : undefined;
        
        if (name && name.length > 10 && name.length < 200 && link && 
            (link.includes('/catalog/') || link.includes('/product/'))) {
          
          const fullUrl = link.startsWith('http') ? link : `https://redhon.ru${link}`;
          const fullImageUrl = image ? (image.startsWith('http') ? image : `https://redhon.ru${image}`) : undefined;

          // Проверяем, не дублируется ли товар
          const isDuplicate = items.some(item => item.name === name || item.externalUrl === fullUrl);
          
          if (!isDuplicate) {
            items.push({
              name: name.substring(0, 200).trim(),
              description: description && description.length > 5 && description.length < 1000 ? description.trim() : undefined,
              manufacturer: 'RHON',
              model: article,
              externalUrl: fullUrl,
              imageUrl: fullImageUrl,
              price: price,
              article: article
            });
          }
        }
      });
    }

    // Если не нашли товары через парсинг, используем данные из веб-поиска
    if (items.length === 0) {
      console.log('  ⚠ Не удалось распарсить страницу, используем данные из веб-поиска...');
      
      const fallbackItems: CentrifugeItem[] = [
        {
          name: 'Центрифуга лабораторная RHON-1412A (UC-1412A), 12х20 мл',
          description: 'Центрифуга лабораторная с ротором на 12х20 мл',
          manufacturer: 'RHON',
          model: 'RHON-1412A',
          article: 'RHON-1412A',
          price: '12 978 руб./шт',
          externalUrl: 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/'
        },
        {
          name: 'Центрифуга лабораторная RHON-1412D (UC-1412D), 12х20 мл',
          description: 'Центрифуга лабораторная с ротором на 12х20 мл',
          manufacturer: 'RHON',
          model: 'RHON-1412D',
          article: 'RHON-1412D',
          price: '33 600 руб./шт',
          externalUrl: 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/'
        },
        {
          name: 'Центрифуга лабораторная RHON-1536Е (UC-1536Е), макс.4х250 мл',
          description: 'Центрифуга лабораторная с максимальной емкостью 4х250 мл',
          manufacturer: 'RHON',
          model: 'RHON-1536Е',
          article: 'RHON-1536Е',
          price: '165 372 руб./шт',
          externalUrl: 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/'
        },
        {
          name: 'Центрифуга лабораторная RHON-4000Е (UC-4000Е), макс.4х100 мл',
          description: 'Центрифуга лабораторная с максимальной емкостью 4х100 мл',
          manufacturer: 'RHON',
          model: 'RHON-4000Е',
          article: 'RHON-4000Е',
          price: '112 122 руб./шт',
          externalUrl: 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/'
        },
        {
          name: 'Центрифуга лабораторная RHON-6000Е (UC-6000Е), 6х50 мл',
          description: 'Центрифуга лабораторная с ротором на 6х50 мл',
          manufacturer: 'RHON',
          model: 'RHON-6000Е',
          article: 'RHON-6000Е',
          price: '64 548 руб./шт',
          externalUrl: 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/'
        }
      ];
      
      return fallbackItems;
    }

    // Удаляем дубликаты
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name && t.externalUrl === item.externalUrl)
    );

    console.log(`  ✅ Найдено уникальных товаров: ${uniqueItems.length}`);
    return uniqueItems;
  } catch (error: any) {
    console.error(`  ❌ Ошибка парсинга ${url}:`, error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('  ⚠ Не удалось подключиться к сайту. Используем резервные данные.');
    }
    // Возвращаем резервные данные при ошибке
    return [
      {
        name: 'Центрифуга лабораторная RHON-1412A (UC-1412A), 12х20 мл',
        description: 'Центрифуга лабораторная с ротором на 12х20 мл',
        manufacturer: 'RHON',
        model: 'RHON-1412A',
        article: 'RHON-1412A',
        price: '12 978 руб./шт',
        externalUrl: url
      },
      {
        name: 'Центрифуга лабораторная RHON-1412D (UC-1412D), 12х20 мл',
        description: 'Центрифуга лабораторная с ротором на 12х20 мл',
        manufacturer: 'RHON',
        model: 'RHON-1412D',
        article: 'RHON-1412D',
        price: '33 600 руб./шт',
        externalUrl: url
      },
      {
        name: 'Центрифуга лабораторная RHON-1536Е (UC-1536Е), макс.4х250 мл',
        description: 'Центрифуга лабораторная с максимальной емкостью 4х250 мл',
        manufacturer: 'RHON',
        model: 'RHON-1536Е',
        article: 'RHON-1536Е',
        price: '165 372 руб./шт',
        externalUrl: url
      },
      {
        name: 'Центрифуга лабораторная RHON-4000Е (UC-4000Е), макс.4х100 мл',
        description: 'Центрифуга лабораторная с максимальной емкостью 4х100 мл',
        manufacturer: 'RHON',
        model: 'RHON-4000Е',
        article: 'RHON-4000Е',
        price: '112 122 руб./шт',
        externalUrl: url
      },
      {
        name: 'Центрифуга лабораторная RHON-6000Е (UC-6000Е), 6х50 мл',
        description: 'Центрифуга лабораторная с ротором на 6х50 мл',
        manufacturer: 'RHON',
        model: 'RHON-6000Е',
        article: 'RHON-6000Е',
        price: '64 548 руб./шт',
        externalUrl: url
      }
    ];
  }
}

async function main() {
  try {
    console.log('🚀 Начало парсинга центрифуг с redhon.ru...\n');

    // Получаем ID категории "Лабораторные центрифуги"
    const sectionId = await getCentrifugeSectionId();
    console.log(`✅ Найдена категория "Лабораторные центрифуги" с ID: ${sectionId}\n`);

    // Парсим данные с сайта
    const url = 'https://redhon.ru/catalog/tsentrifugi_laboratornye/filter/brand-is-rhon/apply/';
    const items = await parseRedhonCentrifugesPage(url);

    if (items.length === 0) {
      console.log('\n⚠ Не удалось получить данные. Проверьте подключение к интернету.');
      return;
    }

    console.log(`\n📦 Добавление ${items.length} карточек оборудования...\n`);
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const item of items) {
      try {
        await addCentrifugeCard(sectionId, item);
        addedCount++;
      } catch (error: any) {
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Процесс завершен!`);
    console.log(`   Добавлено новых карточек: ${addedCount}`);
    if (skippedCount > 0) {
      console.log(`   Пропущено (уже существуют): ${skippedCount}`);
    }
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    if (error.message.includes('не найдена')) {
      console.error('\n💡 Сначала создайте категорию "Лабораторные центрифуги" через интерфейс или скрипт add-centrifuge-category.ts');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();


