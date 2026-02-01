import axios from 'axios';
import * as cheerio from 'cheerio';

async function detailedAnalysis() {
  try {
    const response = await axios.get('https://redhon.ru/catalog/dozatory_i_pipetki/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('=== Детальный анализ структуры товаров ===\n');
    
    // Ищем товары в .table-view__item или .main_item_wrapper
    const items = $('.table-view__item, .main_item_wrapper');
    console.log(`Найдено товаров: ${items.length}\n`);

    if (items.length > 0) {
      // Анализируем первые 3 товара
      items.slice(0, 3).each((i, item) => {
        const $item = $(item);
        console.log(`\n=== Товар ${i + 1} ===`);
        console.log('HTML структура:');
        console.log($item.html()?.substring(0, 500));
        console.log('\n---');
        
        // Ищем название
        const title = $item.find('h3, h4, .item-title, .product-title, a.title').first().text().trim();
        console.log(`Название: ${title}`);
        
        // Ищем ссылку
        const link = $item.find('a').first().attr('href');
        console.log(`Ссылка: ${link}`);
        
        // Ищем изображение
        const img = $item.find('img').first().attr('src') || $item.find('img').first().attr('data-src');
        console.log(`Изображение: ${img}`);
        
        // Ищем описание
        const desc = $item.find('.item-description, .product-description, .description, p').first().text().trim();
        console.log(`Описание: ${desc.substring(0, 100)}`);
        
        // Ищем артикул/модель
        const article = $item.find('.article, .sku, [class*="article"], [class*="sku"]').first().text().trim();
        console.log(`Артикул: ${article}`);
        
        // Ищем цену
        const price = $item.find('.price, .cost, [class*="price"]').first().text().trim();
        console.log(`Цена: ${price}`);
      });
    }

    // Альтернативный подход - ищем все h3/h4 с ссылками
    console.log('\n\n=== Альтернативный подход: поиск через заголовки ===\n');
    const productHeaders = $('h3 a, h4 a').filter((i, el) => {
      const text = $(el).text().trim();
      return text.length > 10 && !text.includes('Лабораторные дозаторы');
    });

    console.log(`Найдено заголовков с ссылками: ${productHeaders.length}\n`);
    
    productHeaders.slice(0, 5).each((i, header) => {
      const $header = $(header);
      const title = $header.text().trim();
      const link = $header.attr('href');
      const parent = $header.closest('.table-view__item, .main_item_wrapper, .item_info');
      
      console.log(`${i + 1}. ${title}`);
      console.log(`   Ссылка: ${link}`);
      
      // Ищем изображение в родительском элементе
      const img = parent.find('img').first().attr('src') || parent.find('img').first().attr('data-src');
      if (img && !img.includes('data:image')) {
        console.log(`   Изображение: ${img}`);
      }
      
      // Ищем описание
      const desc = parent.find('p, .text').first().text().trim();
      if (desc) {
        console.log(`   Описание: ${desc.substring(0, 60)}`);
      }
    });

  } catch (error: any) {
    console.error('Ошибка:', error.message);
  }
}

detailedAnalysis();

