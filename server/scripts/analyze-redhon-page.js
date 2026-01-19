const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('redhon-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Анализ структуры страницы redhon.ru...\n');

// Ищем все ссылки на товары
console.log('=== Поиск ссылок на товары ===');
const productLinks = $('a[href*="/catalog/"]').filter((i, el) => {
  const text = $(el).text().trim();
  const href = $(el).attr('href');
  return text && text.length > 5 && text.length < 200 && 
         href && !href.includes('dozatory_i_pipetki') &&
         href.match(/\/catalog\/[^\/]+\/[^\/]+/);
});

console.log(`Найдено потенциальных товаров: ${productLinks.length}\n`);

if (productLinks.length > 0) {
  console.log('Первые 10 товаров:');
  productLinks.slice(0, 10).each((i, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr('href');
    const parent = $el.closest('div, article, li, tr');
    const image = $el.find('img').first().attr('src') || 
                 parent.find('img').first().attr('src');
    
    console.log(`\n${i + 1}. ${text.substring(0, 80)}`);
    console.log(`   Ссылка: ${href}`);
    if (image) console.log(`   Изображение: ${image}`);
    console.log(`   Родительский класс: ${parent.attr('class') || 'нет'}`);
  });
}

// Ищем классы контейнеров товаров
console.log('\n=== Поиск классов контейнеров ===');
const containers = $('[class*="product"], [class*="item"], [class*="card"], [class*="goods"]');
const classCounts = {};
containers.each((i, el) => {
  const classes = $(el).attr('class');
  if (classes) {
    classes.split(' ').forEach(cls => {
      if (cls.length > 3) {
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
    });
  }
});

const sortedClasses = Object.entries(classCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('Топ-20 классов:');
sortedClasses.forEach(([cls, count]) => {
  console.log(`  ${cls}: ${count}`);
});







