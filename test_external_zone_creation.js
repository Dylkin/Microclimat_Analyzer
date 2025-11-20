// Тест создания зоны "Внешний датчик"
console.log('🧪 Тестирование создания зоны "Внешний датчик"');

// Тест 1: Проверка логики определения существования зоны "Внешний датчик"
function testExternalZoneDetection() {
  console.log('\n📋 Тест 1: Определение существования зоны "Внешний датчик"');
  
  const zones1 = [
    { zoneNumber: 1, id: 'zone-1' },
    { zoneNumber: 2, id: 'zone-2' }
  ];
  
  const zones2 = [
    { zoneNumber: 0, id: 'zone-external' },
    { zoneNumber: 1, id: 'zone-1' },
    { zoneNumber: 2, id: 'zone-2' }
  ];
  
  // Новая логика: проверка по номеру зоны 0
  const hasExternalZone1 = zones1.some(zone => zone.zoneNumber === 0);
  const hasExternalZone2 = zones2.some(zone => zone.zoneNumber === 0);
  
  console.log('Зоны без внешней зоны:', zones1.map(z => z.zoneNumber));
  console.log('Есть ли зона "Внешний датчик":', hasExternalZone1);
  
  console.log('Зоны с внешней зоной:', zones2.map(z => z.zoneNumber));
  console.log('Есть ли зона "Внешний датчик":', hasExternalZone2);
}

// Тест 2: Создание зоны "Внешний датчик"
function testExternalZoneCreation() {
  console.log('\n📋 Тест 2: Создание зоны "Внешний датчик"');
  
  const existingZones = [
    { zoneNumber: 1, id: 'zone-1', measurementLevels: [] },
    { zoneNumber: 2, id: 'zone-2', measurementLevels: [] }
  ];
  
  console.log('Существующие зоны:', existingZones.map(z => z.zoneNumber));
  
  // Создаем зону "Внешний датчик"
  const externalZone = {
    id: `zone-external-${Date.now()}`,
    zoneNumber: 0,
    measurementLevels: [
      {
        id: `level-external-${Date.now()}`,
        level: 1.0,
        equipmentId: `equipment-external-${Date.now()}`,
        equipmentName: 'Внешний датчик'
      }
    ]
  };
  
  // Добавляем зону "Внешний датчик" в начало списка
  const updatedZones = [externalZone, ...existingZones];
  
  console.log('Обновленные зоны:', updatedZones.map(z => z.zoneNumber));
  console.log('Зона "Внешний датчик" создана:', externalZone);
}

// Тест 3: Проверка этапа "Расстановка логгеров"
function testLoggerPlacementStage() {
  console.log('\n📋 Тест 3: Проверка этапа "Расстановка логгеров"');
  
  const stages = [
    { stageName: 'Испытание в пустом объеме' },
    { stageName: 'Расстановка логгеров' },
    { stageName: 'Испытание в загруженном объеме' }
  ];
  
  const hasLoggerPlacementStage = stages.some(stage => stage.stageName === 'Расстановка логгеров');
  
  console.log('Этапы:', stages.map(s => s.stageName));
  console.log('Есть ли этап "Расстановка логгеров":', hasLoggerPlacementStage);
  
  if (hasLoggerPlacementStage) {
    console.log('✅ Этап "Расстановка логгеров" найден - можно создавать зону "Внешний датчик"');
  } else {
    console.log('❌ Этап "Расстановка логгеров" не найден');
  }
}

// Тест 4: Полный сценарий создания зоны
function testFullScenario() {
  console.log('\n📋 Тест 4: Полный сценарий создания зоны');
  
  // Симуляция загрузки объекта квалификации
  const qualificationObject = {
    id: 'test-object',
    measurementZones: [
      { zoneNumber: 1, id: 'zone-1', measurementLevels: [] }
    ]
  };
  
  console.log('Загружен объект квалификации:', qualificationObject.id);
  console.log('Существующие зоны:', qualificationObject.measurementZones.map(z => z.zoneNumber));
  
  // Проверяем, есть ли зона "Внешний датчик"
  const hasExternalZone = qualificationObject.measurementZones.some(zone => zone.zoneNumber === 0);
  
  if (!hasExternalZone) {
    console.log('Зона "Внешний датчик" не найдена, создаем её');
    
    const externalZone = {
      id: `zone-external-${Date.now()}`,
      zoneNumber: 0,
      measurementLevels: [
        {
          id: `level-external-${Date.now()}`,
          level: 1.0,
          equipmentId: `equipment-external-${Date.now()}`,
          equipmentName: 'Внешний датчик'
        }
      ]
    };
    
    // Добавляем зону "Внешний датчик" в начало списка
    const updatedZones = [externalZone, ...qualificationObject.measurementZones];
    
    console.log('✅ Зона "Внешний датчик" создана');
    console.log('Обновленные зоны:', updatedZones.map(z => z.zoneNumber));
  } else {
    console.log('Зона "Внешний датчик" уже существует');
  }
}

// Запуск тестов
testExternalZoneDetection();
testExternalZoneCreation();
testLoggerPlacementStage();
testFullScenario();

console.log('\n🎯 Тестирование завершено!');
console.log('📝 Исправления для создания зоны "Внешний датчик":');
console.log('   - Изменена логика проверки существования зоны (по номеру 0)');
console.log('   - Добавлено создание зоны при загрузке этапов');
console.log('   - Добавлено создание зоны при загрузке зон измерения');
console.log('   - Зона "Внешний датчик" создается с номером 0 и добавляется в начало списка');









