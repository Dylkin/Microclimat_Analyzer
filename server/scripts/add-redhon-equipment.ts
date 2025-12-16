import dotenv from 'dotenv';
import { pool } from '../config/database.js';
import axios from 'axios';
import { load } from 'cheerio';

dotenv.config();

interface EquipmentItem {
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  externalUrl: string;
  imageUrl?: string;
}

async function addEquipmentSection(name: string, description?: string): Promise<string> {
  try {
    // Проверяем, существует ли раздел
    const checkResult = await pool.query(
      'SELECT id FROM equipment_sections WHERE name = $1',
      [name]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Раздел "${name}" уже существует`);
      return checkResult.rows[0].id;
    }

    // Создаем раздел
    const result = await pool.query(
      'INSERT INTO equipment_sections (name, description) VALUES ($1, $2) RETURNING id',
      [name, description || null]
    );

    console.log(`Создан раздел "${name}" с ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`Ошибка создания раздела "${name}":`, error);
    throw error;
  }
}

async function addEquipmentCard(sectionId: string, card: EquipmentItem): Promise<void> {
  try {
    // Проверяем, существует ли карточка
    const checkResult = await pool.query(
      'SELECT id FROM equipment_cards WHERE section_id = $1 AND name = $2',
      [sectionId, card.name]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Карточка "${card.name}" уже существует в разделе`);
      return;
    }

    // Создаем карточку
    await pool.query(
      `INSERT INTO equipment_cards (
        section_id, name, description, manufacturer, model, 
        specifications, image_url, external_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sectionId,
        card.name,
        card.description || null,
        card.manufacturer || null,
        card.model || null,
        JSON.stringify({}),
        card.imageUrl || null,
        card.externalUrl
      ]
    );

    console.log(`Добавлена карточка: ${card.name}`);
  } catch (error) {
    console.error(`Ошибка добавления карточки "${card.name}":`, error);
    throw error;
  }
}

async function parseRedhonPage(url: string): Promise<EquipmentItem[]> {
  try {
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
    const items: EquipmentItem[] = [];

    console.log('Поиск элементов товаров...');

    // Пробуем различные селекторы, характерные для интернет-магазинов redhon.ru
    const selectors = [
      '.item',  // Основной класс товаров на redhon.ru
      '.product-item',
      '.catalog-item',
      '.item-card',
      '.product-card',
      '.goods-item',
      '.product',
      '[class*="product"]',
      '[class*="item"]',
      '[class*="card"]',
      'article',
      '.catalog-product',
      '.product-list-item'
    ];

    let foundElements: ReturnType<typeof $> | null = null;
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Найдено элементов с селектором "${selector}": ${elements.length}`);
        foundElements = elements;
        break;
      }
    }

    if (!foundElements || foundElements.length === 0) {
      // Если не нашли стандартные селекторы, ищем ссылки на товары
      console.log('Стандартные селекторы не найдены, ищем ссылки на товары...');
      foundElements = $('a[href*="/catalog/"], a[href*="/product/"], a[href*="/item/"]').filter((i, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/catalog/') || href.includes('/product/') || href.includes('/item/');
      });
    }

    if (!foundElements || foundElements.length === 0) {
      console.log('Товары не найдены. Пробуем альтернативный подход...');
      // Ищем все ссылки, которые могут быть товарами
      $('a').each((index, element) => {
        const $el = $(element);
        const href = $el.attr('href');
        const text = $el.text().trim();
        
        if (href && text && text.length > 5 && text.length < 200 && 
            (href.includes('/catalog/') || href.includes('/product/'))) {
          const fullUrl = href.startsWith('http') ? href : `https://redhon.ru${href}`;
          
          // Ищем изображение рядом со ссылкой
          const image = $el.find('img').first().attr('src') || 
                       $el.find('img').first().attr('data-src') ||
                       $el.closest('div, article, li').find('img').first().attr('src');
          
          const fullImageUrl = image ? (image.startsWith('http') ? image : `https://redhon.ru${image}`) : undefined;
          
          // Извлекаем производителя и модель из названия
          let manufacturer = '';
          let model = '';
          const nameParts = text.split(/\s+/);
          if (nameParts.length > 1) {
            manufacturer = nameParts[0];
            model = nameParts.slice(1).join(' ');
          }

          items.push({
            name: text,
            manufacturer: manufacturer || undefined,
            model: model || undefined,
            externalUrl: fullUrl,
            imageUrl: fullImageUrl
          });
        }
      });
    } else {
      // Парсим найденные элементы
      foundElements.each((index, element) => {
        const $el = $(element);
        
        // Ищем название товара (для redhon.ru обычно в ссылке или заголовке)
        const nameLink = $el.find('a').first();
        const name = nameLink.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                    nameLink.text().trim() ||
                    $el.find('.item-title, .title, h3, h4, h2, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                    $el.find('a').first().text().trim() ||
                    $el.text().trim().split('\n')[0].trim();
        
        // Ищем описание
        const description = $el.find('.product-description, .item-description, .description, [class*="description"], .item-text').first().text().trim() ||
                          $el.find('p').first().text().trim();
        
        // Ищем ссылку (для redhon.ru ссылка обычно на товар внутри .item)
        const link = nameLink.attr('href') ||
                    $el.find('a[href*="/catalog/"]').first().attr('href') ||
                    $el.attr('href') ||
                    $el.closest('a').attr('href');
        
        // Ищем изображение (для redhon.ru обычно в .item-image или подобном)
        const image = $el.find('.item-image img, .item-img img, img').first().attr('src') || 
                     $el.find('img').first().attr('data-src') ||
                     $el.find('img').first().attr('data-lazy-src') ||
                     $el.find('img').first().attr('data-original') ||
                     $el.find('[style*="background-image"]').first().attr('style')?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
        
        // Извлекаем производителя и модель
        let manufacturer = '';
        let model = '';
        if (name) {
          const parts = name.split(/\s+/);
          if (parts.length > 1) {
            manufacturer = parts[0];
            model = parts.slice(1).join(' ');
          }
        }

        // Фильтруем только товары из нужной категории (дозаторы и пипетки)
        if (name && name.length > 3 && name.length < 200 && link && 
            (link.includes('/catalog/') || link.includes('/product/'))) {
          
          // Пропускаем ссылки на другие категории каталога
          if (link.includes('/catalog/') && !link.match(/\/catalog\/[^\/]+\/[^\/]+/)) {
            return; // Это ссылка на подкатегорию, а не на товар
          }
          
          const fullUrl = link.startsWith('http') ? link : `https://redhon.ru${link}`;
          const fullImageUrl = image ? (image.startsWith('http') ? image : `https://redhon.ru${image}`) : undefined;

          // Проверяем, не дублируется ли товар
          const isDuplicate = items.some(item => item.name === name || item.externalUrl === fullUrl);
          
          if (!isDuplicate && name.length > 5) { // Минимальная длина названия
            items.push({
              name: name.substring(0, 200).trim(), // Ограничиваем длину названия
              description: description && description.length > 5 && description.length < 1000 ? description.trim() : undefined,
              manufacturer: manufacturer || undefined,
              model: model || undefined,
              externalUrl: fullUrl,
              imageUrl: fullImageUrl
            });
          }
        }
      });
    }

    // Удаляем дубликаты
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex(t => t.name === item.name && t.externalUrl === item.externalUrl)
    );

    console.log(`Найдено уникальных товаров: ${uniqueItems.length}`);
    return uniqueItems;
  } catch (error: any) {
    console.error(`Ошибка парсинга ${url}:`, error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('Не удалось подключиться к сайту. Используем резервные данные.');
    }
    return [];
  }
}

async function main() {
  try {
    console.log('Начало добавления оборудования с redhon.ru...\n');

    // Создаем или получаем раздел
    let sectionId: string;
    try {
      sectionId = await addEquipmentSection(
        'Лабораторные дозаторы и пипетки',
        'Оборудование для дозирования и пипетирования в лабораторных условиях'
      );
    } catch (error: any) {
      // Если раздел уже существует, получаем его ID
      const result = await pool.query(
        'SELECT id FROM equipment_sections WHERE name = $1',
        ['Лабораторные дозаторы и пипетки']
      );
      if (result.rows.length > 0) {
        sectionId = result.rows[0].id;
        console.log(`Используем существующий раздел с ID: ${sectionId}`);
      } else {
        throw error;
      }
    }

    // Парсим данные с сайта
    const url = 'https://redhon.ru/catalog/dozatory_i_pipetki/';
    const items = await parseRedhonPage(url);

    if (items.length === 0) {
      console.log('\n⚠ Не удалось получить данные с сайта. Добавляем базовые карточки...');
      
      // Резервные данные
      const fallbackItems: EquipmentItem[] = [
        {
          name: 'Дозатор автоматический',
          description: 'Автоматический дозатор для лабораторных работ',
          manufacturer: 'Redhon',
          externalUrl: url
        },
        {
          name: 'Пипетка механическая',
          description: 'Механическая пипетка для точного дозирования',
          manufacturer: 'Redhon',
          externalUrl: url
        },
        {
          name: 'Дозатор объемный',
          description: 'Объемный дозатор для жидкостей',
          manufacturer: 'Redhon',
          externalUrl: url
        },
        {
          name: 'Пипетка автоматическая',
          description: 'Автоматическая пипетка с электронным управлением',
          manufacturer: 'Redhon',
          externalUrl: url
        }
      ];

      for (const item of fallbackItems) {
        await addEquipmentCard(sectionId, item);
      }
    } else {
      console.log(`\nДобавление ${items.length} карточек оборудования...`);
      let addedCount = 0;
      let skippedCount = 0;
      
      for (const item of items) {
        try {
          await addEquipmentCard(sectionId, item);
          addedCount++;
        } catch (error: any) {
          if (error.message.includes('уже существует')) {
            skippedCount++;
          } else {
            console.error(`Ошибка добавления "${item.name}":`, error.message);
          }
        }
      }
      
      console.log(`\n✅ Добавлено карточек: ${addedCount}`);
      if (skippedCount > 0) {
        console.log(`⚠ Пропущено (уже существуют): ${skippedCount}`);
      }
    }

    console.log('\n✅ Процесс завершен!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

