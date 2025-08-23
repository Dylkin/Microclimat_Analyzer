import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем конфигурацию Supabase из переменных окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не настроены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateMeasurementEquipment() {
  console.log('Начинаем добавление измерительного оборудования...');
  
  const equipmentToAdd = [];
  
  // Добавляем Testo 174T с номерами от 001 до 100
  for (let i = 1; i <= 100; i++) {
    const number = i.toString().padStart(3, '0');
    equipmentToAdd.push({
      type: 'Testo 174T',
      name: `DL-${number}`,
      serial_number: `174T-${number}-2025`
    });
  }
  
  // Добавляем Testo 174H с номерами от 200 до 299
  for (let i = 200; i <= 299; i++) {
    const number = i.toString();
    equipmentToAdd.push({
      type: 'Testo 174H',
      name: `DL-${number}`,
      serial_number: `174H-${number}-2025`
    });
  }
  
  console.log(`Подготовлено ${equipmentToAdd.length} записей для добавления`);
  
  try {
    // Добавляем записи батчами по 50 для оптимизации
    const batchSize = 50;
    let addedCount = 0;
    
    for (let i = 0; i < equipmentToAdd.length; i += batchSize) {
      const batch = equipmentToAdd.slice(i, i + batchSize);
      
      console.log(`Добавляем батч ${Math.floor(i / batchSize) + 1}/${Math.ceil(equipmentToAdd.length / batchSize)} (${batch.length} записей)...`);
      
      const { data, error } = await supabase
        .from('measurement_equipment')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('Ошибка добавления батча:', error);
        
        // Если ошибка связана с дублированием, пытаемся добавить по одной записи
        if (error.code === '23505') {
          console.log('Обнаружены дубликаты, добавляем записи по одной...');
          
          for (const equipment of batch) {
            try {
              const { error: singleError } = await supabase
                .from('measurement_equipment')
                .insert(equipment);
              
              if (singleError) {
                if (singleError.code === '23505') {
                  console.warn(`Пропускаем дубликат: ${equipment.name} (${equipment.serial_number})`);
                } else {
                  console.error(`Ошибка добавления ${equipment.name}:`, singleError);
                }
              } else {
                addedCount++;
                console.log(`✓ Добавлено: ${equipment.name}`);
              }
            } catch (singleErr) {
              console.error(`Исключение при добавлении ${equipment.name}:`, singleErr);
            }
          }
        } else {
          throw error;
        }
      } else {
        addedCount += data.length;
        console.log(`✓ Батч добавлен успешно: ${data.length} записей`);
      }
    }
    
    console.log(`\n🎉 Завершено! Добавлено ${addedCount} записей измерительного оборудования`);
    console.log(`📊 Статистика:`);
    console.log(`   • Testo 174T (DL-001 до DL-100): ${Math.min(100, addedCount)} записей`);
    console.log(`   • Testo 174H (DL-200 до DL-299): ${Math.max(0, addedCount - 100)} записей`);
    
  } catch (error) {
    console.error('Критическая ошибка при добавлении оборудования:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
populateMeasurementEquipment()
  .then(() => {
    console.log('Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });