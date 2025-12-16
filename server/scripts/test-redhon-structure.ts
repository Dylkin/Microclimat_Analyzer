import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeRedhonStructure() {
  try {
    console.log('Получение HTML страницы...');
    const response = await axios.get('https://redhon.ru/catalog/dozatory_i_pipetki/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('\n=== Анализ структуры страницы ===\n');
    
    // Ищем различные возможные селекторы для карточек товаров
    const possibleSelectors = [
      '.product-item',
      '.catalog-item',
      '.item-card',
      '.product-card',
      '.goods-item',
      '.product',
      '[class*="product"]',
      '[class*="item"]',
      '[class*="card"]',
      '.catalog-product',
      '.product-list-item'
    ];

    console.log('Поиск карточек товаров...\n');
    
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✓ Найдено ${elements.length} элементов с селектором: ${selector}`);
        
        // Анализируем первый элемент
        const first = elements.first();
        console.log(`  Структура первого элемента:`);
        console.log(`  - HTML классы: ${first.attr('class')}`);
        console.log(`  - Название: ${first.find('h1, h2, h3, h4, .title, .name, a').first().text().trim().substring(0, 50)}`);
        console.log(`  - Ссылка: ${first.find('a').first().attr('href')?.substring(0, 50)}`);
        console.log('');
      }
    }

    // Ищем все ссылки на товары
    console.log('\n=== Поиск ссылок на товары ===\n');
    const productLinks = $('a[href*="/catalog/"], a[href*="/product/"], a[href*="/item/"]');
    console.log(`Найдено потенциальных ссылок на товары: ${productLinks.length}`);
    
    if (productLinks.length > 0) {
      console.log('\nПервые 5 ссылок:');
      productLinks.slice(0, 5).each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        console.log(`  ${i + 1}. ${text.substring(0, 50)} -> ${href}`);
      });
    }

    // Ищем заголовки товаров
    console.log('\n=== Поиск заголовков товаров ===\n');
    const titles = $('h1, h2, h3, h4, .product-title, .item-title, .goods-title');
    console.log(`Найдено заголовков: ${titles.length}`);
    
    if (titles.length > 0) {
      console.log('\nПервые 10 заголовков:');
      titles.slice(0, 10).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          console.log(`  ${i + 1}. ${text.substring(0, 80)}`);
        }
      });
    }

    // Ищем изображения
    console.log('\n=== Поиск изображений товаров ===\n');
    const images = $('img[src*="catalog"], img[src*="product"], img[src*="goods"]');
    console.log(`Найдено изображений: ${images.length}`);
    
    if (images.length > 0) {
      console.log('\nПервые 5 изображений:');
      images.slice(0, 5).each((i, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt');
        console.log(`  ${i + 1}. ${alt?.substring(0, 50)} -> ${src?.substring(0, 60)}`);
      });
    }

    // Сохраняем HTML для ручного анализа
    console.log('\n=== Сохранение HTML для анализа ===\n');
    import('fs').then(fs => {
      fs.writeFileSync('redhon-page.html', response.data);
      console.log('HTML сохранен в файл redhon-page.html');
    });

  } catch (error: any) {
    console.error('Ошибка:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data.substring(0, 500));
    }
  }
}

analyzeRedhonStructure();

