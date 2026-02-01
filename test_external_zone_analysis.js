// Тест изменения логики обработки внешнего датчика в анализе данных
console.log('🧪 Тестирование изменения логики внешнего датчика');

// Тест 1: Проверка логики определения внешнего датчика
function testExternalZoneDetection() {
  console.log('\n📋 Тест 1: Определение внешнего датчика');
  
  const testFiles = [
    { zoneNumber: 0, name: 'external_sensor.vi2' },
    { zoneNumber: 1, name: 'logger_1.vi2' },
    { zoneNumber: 2, name: 'logger_2.vi2' },
    { zoneNumber: 999, name: 'old_external.vi2' } // Старый формат
  ];
  
  testFiles.forEach(file => {
    // Новая логика: внешний датчик имеет номер зоны 0
    const isExternal = file.zoneNumber === 0;
    const displayZone = file.zoneNumber === 0 ? 'Внешний' : (file.zoneNumber || '-');
    
    console.log(`Файл: ${file.name}, Зона: ${file.zoneNumber}, Внешний: ${isExternal}, Отображение: ${displayZone}`);
  });
}

// Тест 2: Проверка логики проверки лимитов
function testLimitsCheck() {
  console.log('\n📋 Тест 2: Проверка лимитов для внешнего датчика');
  
  const testCases = [
    { zoneNumber: 0, temperatures: [20, 25, 30], expected: '-' },
    { zoneNumber: 1, temperatures: [20, 25, 30], expected: 'Да' },
    { zoneNumber: 2, temperatures: [20, 25, 30], expected: 'Да' }
  ];
  
  testCases.forEach(testCase => {
    let meetsLimits = 'Да';
    
    // Новая логика: для внешних датчиков (зона 0) не проверяем лимиты
    if (testCase.zoneNumber === 0) {
      meetsLimits = '-';
    } else if (testCase.temperatures.length > 0) {
      const min = Math.min(...testCase.temperatures);
      const max = Math.max(...testCase.temperatures);
      
      // Простая проверка лимитов (например, 15-35°C)
      if (min < 15 || max > 35) {
        meetsLimits = 'Нет';
      }
    }
    
    console.log(`Зона ${testCase.zoneNumber}: температуры ${testCase.temperatures.join(', ')}°C → ${meetsLimits} (ожидается: ${testCase.expected})`);
  });
}

// Тест 3: Проверка отображения в графике
function testChartDisplay() {
  console.log('\n📋 Тест 3: Отображение в графике');
  
  const dataPoints = [
    { fileId: 'external_1', zoneNumber: 0, temperature: 22.5 },
    { fileId: 'logger_1', zoneNumber: 1, temperature: 24.1 },
    { fileId: 'logger_2', zoneNumber: 2, temperature: 23.8 }
  ];
  
  dataPoints.forEach(point => {
    // Новая логика: внешний датчик имеет номер зоны 0
    const isExternal = point.zoneNumber === 0;
    const displayColor = isExternal ? '#6B7280' : '#3B82F6'; // Серый для внешнего, синий для обычного
    
    console.log(`Файл: ${point.fileId}, Зона: ${point.zoneNumber}, Внешний: ${isExternal}, Цвет: ${displayColor}`);
  });
}

// Тест 4: Проверка глобальных вычислений
function testGlobalCalculations() {
  console.log('\n📋 Тест 4: Глобальные вычисления (исключая внешние датчики)');
  
  const allResults = [
    { zoneNumber: 0, minTemp: 22.0, maxTemp: 25.0, isExternal: true }, // Внешний датчик
    { zoneNumber: 1, minTemp: 20.5, maxTemp: 24.8, isExternal: false },
    { zoneNumber: 2, minTemp: 21.2, maxTemp: 25.3, isExternal: false }
  ];
  
  // Исключаем внешние датчики из глобальных вычислений
  const nonExternalResults = allResults.filter(result => !result.isExternal);
  
  const globalMinTemp = Math.min(...nonExternalResults.map(r => r.minTemp));
  const globalMaxTemp = Math.max(...nonExternalResults.map(r => r.maxTemp));
  
  console.log('Все результаты:', allResults.map(r => `Зона ${r.zoneNumber}: ${r.minTemp}-${r.maxTemp}°C`));
  console.log('Без внешних датчиков:', nonExternalResults.map(r => `Зона ${r.zoneNumber}: ${r.minTemp}-${r.maxTemp}°C`));
  console.log(`Глобальный минимум: ${globalMinTemp}°C`);
  console.log(`Глобальный максимум: ${globalMaxTemp}°C`);
}

// Тест 5: Проверка миграции со старого формата
function testMigrationFromOldFormat() {
  console.log('\n📋 Тест 5: Миграция со старого формата (999 → 0)');
  
  const oldFormatFiles = [
    { zoneNumber: 999, name: 'old_external.vi2' },
    { zoneNumber: 1, name: 'logger_1.vi2' }
  ];
  
  console.log('Старый формат:');
  oldFormatFiles.forEach(file => {
    const isExternalOld = file.zoneNumber === 999;
    console.log(`  Файл: ${file.name}, Зона: ${file.zoneNumber}, Внешний (старая логика): ${isExternalOld}`);
  });
  
  console.log('\nНовый формат:');
  oldFormatFiles.forEach(file => {
    // Миграция: 999 → 0
    const newZoneNumber = file.zoneNumber === 999 ? 0 : file.zoneNumber;
    const isExternalNew = newZoneNumber === 0;
    console.log(`  Файл: ${file.name}, Зона: ${newZoneNumber}, Внешний (новая логика): ${isExternalNew}`);
  });
}

// Запуск тестов
testExternalZoneDetection();
testLimitsCheck();
testChartDisplay();
testGlobalCalculations();
testMigrationFromOldFormat();

console.log('\n🎯 Тестирование завершено!');
console.log('📝 Изменения в логике внешнего датчика:');
console.log('   - Номер зоны изменен с 999 на 0');
console.log('   - Логика определения внешнего датчика обновлена');
console.log('   - Проверка лимитов для зоны 0 возвращает "-"');
console.log('   - Отображение в графике использует серый цвет для зоны 0');
console.log('   - Глобальные вычисления исключают зону 0');
console.log('   - Обновлено примечание в интерфейсе загрузки файлов');









