import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

async function analyzeHTML() {
  try {
    const response = await axios.get('https://redhon.ru/catalog/dozatory_i_pipetki/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Ищем структуру товаров - обычно они в списках или контейнерах
    console.log('=== Анализ структуры товаров ===\n');
    
    // Ищем все h3 и h4, которые могут быть названиями товаров
    const productHeaders = $('h3, h4').filter((i, el) => {
      const text = $(el).text().trim();
      // Пропускаем заголовок категории и ищем товары
      return text.length > 10 && !text.includes('Лабораторные дозаторы');
    });

    console.log(`Найдено заголовков товаров: ${productHeaders.length}\n`);

    // Анализируем структуру вокруг заголовков
    productHeaders.slice(0, 3).each((i, header) => {
      const $header = $(header);
      const title = $header.text().trim();
      const parent = $header.parent();
      const grandParent = parent.parent();
      
      console.log(`Товар ${i + 1}: ${title.substring(0, 60)}`);
      console.log(`  Родительский элемент: ${parent.get(0)?.tagName} class="${parent.attr('class')}"`);
      console.log(`  Родитель родителя: ${grandParent.get(0)?.tagName} class="${grandParent.attr('class')}"`);
      
      // Ищем ссылку
      const link = $header.find('a').attr('href') || parent.find('a').first().attr('href');
      console.log(`  Ссылка: ${link}`);
      
      // Ищем изображение
      const img = parent.find('img').first().attr('src') || grandParent.find('img').first().attr('src');
      console.log(`  Изображение: ${img?.substring(0, 60)}`);
      
      // Ищем описание
      const desc = parent.find('p, .description, .text').first().text().trim();
      if (desc) {
        console.log(`  Описание: ${desc.substring(0, 60)}`);
      }
      
      console.log('');
    });

    // Пробуем найти контейнеры товаров
    console.log('=== Поиск контейнеров товаров ===\n');
    const containers = $('[class*="product"], [class*="item"], [class*="card"], [class*="goods"]');
    const containerClasses = new Set<string>();
    
    containers.each((i, el) => {
      const classes = $(el).attr('class');
      if (classes) {
        classes.split(' ').forEach(cls => {
          if (cls.includes('product') || cls.includes('item') || cls.includes('card') || cls.includes('goods')) {
            containerClasses.add(cls);
          }
        });
      }
    });

    console.log('Найденные классы контейнеров:');
    Array.from(containerClasses).slice(0, 20).forEach(cls => {
      const count = $(`.${cls}`).length;
      console.log(`  .${cls}: ${count} элементов`);
    });

  } catch (error: any) {
    console.error('Ошибка:', error.message);
  }
}

analyzeHTML();

