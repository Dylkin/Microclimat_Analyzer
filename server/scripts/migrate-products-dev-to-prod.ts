import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

interface EquipmentSection {
  id: string;
  name: string;
  description: string | null;
  manufacturers: string[] | null;
  website: string | null;
  supplier_ids: string[] | null;
  created_at: Date;
  updated_at: Date;
}

interface EquipmentCard {
  id: string;
  section_id: string;
  name: string;
  manufacturer: string | null;
  series: string | null;
  channels_count: number | null;
  dosing_volume: string | null;
  volume_step: string | null;
  dosing_accuracy: string | null;
  reproducibility: string | null;
  autoclavable: boolean | null;
  specifications: any;
  external_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Скрипт для переноса всех товаров из dev базы данных в prod базу данных
 */
async function migrateProductsDevToProd() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    console.log('🚀 Скрипт переноса товаров из DEV в PROD\n');
    console.log('⚠️  ВНИМАНИЕ: Этот скрипт перенесет все разделы и карточки товаров из dev базы в prod базу.');
    console.log('   Существующие записи с такими же именами будут обновлены.\n');

    // Запрашиваем подтверждение
    const confirm = await question('Продолжить? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Операция отменена.');
      rl.close();
      return;
    }

    // Запрашиваем параметры подключения к dev базе
    console.log('\n📋 Параметры подключения к DEV базе:');
    const devHost = await question('  Host (по умолчанию localhost): ') || 'localhost';
    const devPort = await question('  Port (по умолчанию 5432): ') || '5432';
    const devDatabase = await question('  Database name: ');
    const devUser = await question('  User (по умолчанию postgres): ') || 'postgres';
    const devPassword = await question('  Password: ');

    // Запрашиваем параметры подключения к prod базе
    console.log('\n📋 Параметры подключения к PROD базе:');
    const prodHost = await question('  Host (по умолчанию localhost): ') || 'localhost';
    const prodPort = await question('  Port (по умолчанию 5432): ') || '5432';
    const prodDatabase = await question('  Database name: ');
    const prodUser = await question('  User (по умолчанию postgres): ') || 'postgres';
    const prodPassword = await question('  Password: ');

    rl.close();

    // Создаем пулы подключений
    const devPool = new Pool({
      host: devHost,
      port: parseInt(devPort),
      database: devDatabase,
      user: devUser,
      password: devPassword,
    });

    const prodPool = new Pool({
      host: prodHost,
      port: parseInt(prodPort),
      database: prodDatabase,
      user: prodUser,
      password: prodPassword,
    });

    console.log('\n🔍 Проверка подключений...');

    // Проверяем подключение к dev
    await devPool.query('SELECT NOW()');
    console.log('✅ Подключение к DEV базе установлено');

    // Проверяем подключение к prod
    await prodPool.query('SELECT NOW()');
    console.log('✅ Подключение к PROD базе установлено');

    // Извлекаем все разделы из dev
    console.log('\n📥 Извлечение разделов из DEV базы...');
    const devSectionsResult = await devPool.query<EquipmentSection>(`
      SELECT 
        id,
        name,
        description,
        manufacturers,
        website,
        supplier_ids,
        created_at,
        updated_at
      FROM equipment_sections
      ORDER BY created_at
    `);

    const devSections = devSectionsResult.rows;
    console.log(`✅ Найдено разделов: ${devSections.length}`);

    if (devSections.length === 0) {
      console.log('⚠️  В dev базе нет разделов для переноса.');
      await devPool.end();
      await prodPool.end();
      return;
    }

    // Извлекаем все карточки из dev
    console.log('\n📥 Извлечение карточек из DEV базы...');
    const devCardsResult = await devPool.query<EquipmentCard>(`
      SELECT 
        id,
        section_id,
        name,
        manufacturer,
        series,
        channels_count,
        dosing_volume,
        volume_step,
        dosing_accuracy,
        reproducibility,
        autoclavable,
        specifications,
        external_url,
        created_at,
        updated_at
      FROM equipment_cards
      ORDER BY created_at
    `);

    const devCards = devCardsResult.rows;
    console.log(`✅ Найдено карточек: ${devCards.length}`);

    // Создаем маппинг ID разделов (dev -> prod)
    const sectionIdMapping = new Map<string, string>();

    // Переносим разделы в prod
    console.log('\n📤 Перенос разделов в PROD базу...');
    let sectionsCreated = 0;
    let sectionsUpdated = 0;

    for (const section of devSections) {
      try {
        // Пытаемся вставить или обновить раздел
        const result = await prodPool.query(`
          INSERT INTO equipment_sections (
            name,
            description,
            manufacturers,
            website,
            supplier_ids,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (name) 
          DO UPDATE SET
            description = EXCLUDED.description,
            manufacturers = EXCLUDED.manufacturers,
            website = EXCLUDED.website,
            supplier_ids = EXCLUDED.supplier_ids,
            updated_at = EXCLUDED.updated_at
          RETURNING id
        `, [
          section.name,
          section.description,
          section.manufacturers || [],
          section.website,
          section.supplier_ids || [],
          section.created_at,
          section.updated_at
        ]);

        const prodSectionId = result.rows[0].id;
        sectionIdMapping.set(section.id, prodSectionId);

        // Проверяем, была ли это новая запись или обновление
        const checkResult = await prodPool.query(
          'SELECT created_at FROM equipment_sections WHERE id = $1',
          [prodSectionId]
        );
        const createdAt = new Date(checkResult.rows[0].created_at);
        const updatedAt = new Date(section.updated_at);
        
        if (createdAt.getTime() === updatedAt.getTime() || Math.abs(createdAt.getTime() - updatedAt.getTime()) < 1000) {
          sectionsCreated++;
        } else {
          sectionsUpdated++;
        }

        console.log(`  ✓ ${section.name} (${prodSectionId.substring(0, 8)}...)`);
      } catch (error: any) {
        console.error(`  ✗ Ошибка при переносе раздела "${section.name}":`, error.message);
      }
    }

    console.log(`\n📊 Разделы: создано ${sectionsCreated}, обновлено ${sectionsUpdated}`);

    // Переносим карточки в prod
    console.log('\n📤 Перенос карточек в PROD базу...');
    let cardsCreated = 0;
    let cardsUpdated = 0;
    let cardsSkipped = 0;

    for (const card of devCards) {
      try {
        // Получаем новый section_id из маппинга
        const prodSectionId = sectionIdMapping.get(card.section_id);

        if (!prodSectionId) {
          console.log(`  ⚠ Пропущена карточка "${card.name}" - раздел не найден в prod`);
          cardsSkipped++;
          continue;
        }

        // Пытаемся вставить или обновить карточку
        const result = await prodPool.query(`
          INSERT INTO equipment_cards (
            section_id,
            name,
            manufacturer,
            series,
            channels_count,
            dosing_volume,
            volume_step,
            dosing_accuracy,
            reproducibility,
            autoclavable,
            specifications,
            external_url,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (section_id, name) 
          DO UPDATE SET
            manufacturer = EXCLUDED.manufacturer,
            series = EXCLUDED.series,
            channels_count = EXCLUDED.channels_count,
            dosing_volume = EXCLUDED.dosing_volume,
            volume_step = EXCLUDED.volume_step,
            dosing_accuracy = EXCLUDED.dosing_accuracy,
            reproducibility = EXCLUDED.reproducibility,
            autoclavable = EXCLUDED.autoclavable,
            specifications = EXCLUDED.specifications,
            external_url = EXCLUDED.external_url,
            updated_at = EXCLUDED.updated_at
          RETURNING id, created_at
        `, [
          prodSectionId,
          card.name,
          card.manufacturer,
          card.series,
          card.channels_count,
          card.dosing_volume,
          card.volume_step,
          card.dosing_accuracy,
          card.reproducibility,
          card.autoclavable,
          card.specifications || {},
          card.external_url,
          card.created_at,
          card.updated_at
        ]);

        // Проверяем, была ли это новая запись или обновление
        const prodCardId = result.rows[0].id;
        const prodCardCreatedAt = new Date(result.rows[0].created_at);
        const cardCreatedAt = new Date(card.created_at);
        
        if (Math.abs(prodCardCreatedAt.getTime() - cardCreatedAt.getTime()) < 1000) {
          cardsCreated++;
        } else {
          cardsUpdated++;
        }

        console.log(`  ✓ ${card.name} (${prodCardId.substring(0, 8)}...)`);
      } catch (error: any) {
        console.error(`  ✗ Ошибка при переносе карточки "${card.name}":`, error.message);
      }
    }

    console.log(`\n📊 Карточки: создано ${cardsCreated}, обновлено ${cardsUpdated}, пропущено ${cardsSkipped}`);

    // Финальная статистика
    console.log('\n📈 Финальная статистика:');
    const prodSectionsCount = await prodPool.query('SELECT COUNT(*) as count FROM equipment_sections');
    const prodCardsCount = await prodPool.query('SELECT COUNT(*) as count FROM equipment_cards');
    
    console.log(`  Разделов в PROD: ${prodSectionsCount.rows[0].count}`);
    console.log(`  Карточек в PROD: ${prodCardsCount.rows[0].count}`);

    console.log('\n✅ Перенос завершен успешно!');

  } catch (error: any) {
    console.error('\n❌ Ошибка при выполнении переноса:', error);
    process.exit(1);
  } finally {
    // Закрываем подключения
    await devPool.end();
    await prodPool.end();
  }
}

migrateProductsDevToProd();




