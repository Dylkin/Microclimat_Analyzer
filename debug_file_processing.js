// Диагностический скрипт для проверки обработки файлов
// Запустите этот скрипт в консоли браузера на странице с блоком "Снятие логгеров"

console.log('🔍 Диагностика обработки файлов');

// Проверяем доступность сервисов
console.log('📋 Проверка сервисов:');
console.log('- qualificationObjectService:', typeof qualificationObjectService !== 'undefined' ? '✅ Доступен' : '❌ Недоступен');
console.log('- loggerDataService:', typeof loggerDataService !== 'undefined' ? '✅ Доступен' : '❌ Недоступен');
console.log('- VI2ParsingService:', typeof VI2ParsingService !== 'undefined' ? '✅ Доступен' : '❌ Недоступен');
console.log('- XLSParser:', typeof XLSParser !== 'undefined' ? '✅ Доступен' : '❌ Недоступен');

// Проверяем состояние компонента
console.log('\n📊 Состояние компонента:');
const component = document.querySelector('[data-testid="qualification-work-schedule"]');
if (component) {
  console.log('- Компонент найден: ✅');
  
  // Проверяем файлы в Storage
  console.log('\n🗂️ Проверка файлов в Storage:');
  const fileRows = document.querySelectorAll('tbody tr');
  console.log(`- Найдено строк файлов: ${fileRows.length}`);
  
  fileRows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      const zone = cells[0]?.textContent?.trim();
      const level = cells[1]?.textContent?.trim();
      const name = cells[2]?.textContent?.trim();
      const fileName = cells[3]?.textContent?.trim();
      const status = cells[4]?.textContent?.trim();
      
      console.log(`  Файл ${index + 1}:`);
      console.log(`    - Зона: ${zone}`);
      console.log(`    - Уровень: ${level}`);
      console.log(`    - Название: ${name}`);
      console.log(`    - Имя файла: ${fileName}`);
      console.log(`    - Статус: ${status}`);
    }
  });
} else {
  console.log('- Компонент не найден: ❌');
}

// Проверяем ошибки в консоли
console.log('\n🚨 Проверка ошибок:');
const originalError = console.error;
const errors = [];
console.error = function(...args) {
  errors.push(args.join(' '));
  originalError.apply(console, args);
};

// Восстанавливаем оригинальный console.error через 5 секунд
setTimeout(() => {
  console.error = originalError;
  console.log(`- Найдено ошибок: ${errors.length}`);
  errors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error}`);
  });
}, 5000);

console.log('\n✅ Диагностика завершена. Проверьте результаты выше.');



















