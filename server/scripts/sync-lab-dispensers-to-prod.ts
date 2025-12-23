/**
 * Копирует карточки категории "Лабораторные дозаторы и пипетки" из dev БД в prod БД.
 *
 * Запуск:
 *  DEV_DATABASE_URL=postgres://... PROD_DATABASE_URL=postgres://... npx tsx server/scripts/sync-lab-dispensers-to-prod.ts
 *
 * Поведение:
 *  - Ищет категорию по имени в обеих БД.
 *  - Читает все карточки из dev.
 *  - В prod добавляет только отсутствующие (сравнение по имени в рамках категории).
 */

import 'dotenv/config';
import { Pool } from 'pg';

const CATEGORY_NAME = 'Лабораторные дозаторы и пипетки';

function createPool(urlEnv: string | undefined, label: string) {
  if (!urlEnv) {
    throw new Error(`Не указана строка подключения для ${label}. Установите ${label === 'dev' ? 'DEV_DATABASE_URL' : 'PROD_DATABASE_URL'}.`);
  }
  return new Pool({ connectionString: urlEnv });
}

async function getSectionId(pool: Pool, name: string): Promise<string> {
  const res = await pool.query(
    'SELECT id FROM equipment_sections WHERE name = $1 LIMIT 1',
    [name]
  );
  if (!res.rows.length) {
    throw new Error(`Категория "${name}" не найдена в базе.`);
  }
  return res.rows[0].id;
}

type CardRow = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
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
  image_url: string | null;
};

async function fetchDevCards(devPool: Pool, sectionId: string): Promise<CardRow[]> {
  const res = await devPool.query<CardRow>(
    `SELECT id, section_id, name, description, manufacturer, series,
            channels_count, dosing_volume, volume_step, dosing_accuracy,
            reproducibility, autoclavable, specifications, external_url, image_url
     FROM equipment_cards
     WHERE section_id = $1
     ORDER BY name`,
    [sectionId]
  );
  return res.rows;
}

async function ensureProdCards(prodPool: Pool, sectionId: string, cards: CardRow[]) {
  let created = 0;
  for (const card of cards) {
    const exists = await prodPool.query(
      'SELECT 1 FROM equipment_cards WHERE section_id = $1 AND name = $2 LIMIT 1',
      [sectionId, card.name]
    );
    if (exists.rows.length) {
      continue;
    }

    await prodPool.query(
      `INSERT INTO equipment_cards (
        section_id, name, description, manufacturer, series,
        channels_count, dosing_volume, volume_step, dosing_accuracy,
        reproducibility, autoclavable, specifications, external_url, image_url
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14
      )`,
      [
        sectionId,
        card.name,
        card.description,
        card.manufacturer,
        card.series,
        card.channels_count,
        card.dosing_volume,
        card.volume_step,
        card.dosing_accuracy,
        card.reproducibility,
        card.autoclavable,
        card.specifications ? JSON.stringify(card.specifications) : null,
        card.external_url,
        card.image_url
      ]
    );
    created += 1;
    console.log(`Добавлена карточка: ${card.name}`);
  }
  console.log(`Всего добавлено: ${created}`);
}

async function main() {
  const devPool = createPool(process.env.DEV_DATABASE_URL, 'dev');
  const prodPool = createPool(process.env.PROD_DATABASE_URL, 'prod');

  try {
    const devSectionId = await getSectionId(devPool, CATEGORY_NAME);
    const prodSectionId = await getSectionId(prodPool, CATEGORY_NAME);

    console.log(`Категория найдена. dev=${devSectionId}, prod=${prodSectionId}`);

    const devCards = await fetchDevCards(devPool, devSectionId);
    console.log(`Найдено карточек в dev: ${devCards.length}`);

    await ensureProdCards(prodPool, prodSectionId, devCards);
    console.log('Готово.');
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

main().catch((err) => {
  console.error('Ошибка при синхронизации карточек:', err);
  process.exit(1);
});
