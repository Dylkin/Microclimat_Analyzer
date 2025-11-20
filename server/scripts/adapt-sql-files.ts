import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const sqlDir = process.cwd();
const files = readdirSync(sqlDir).filter(f => f.endsWith('.sql') && f !== 'database_setup.sql');

function adaptSqlFile(content: string): string {
  let adapted = content;

  // Удаляем ссылки на auth схему
  adapted = adapted.replace(/auth\.role\(\)/g, 'true');
  adapted = adapted.replace(/auth\.uid\(\)/g, 'NULL');
  adapted = adapted.replace(/auth\.config/g, 'public.config');
  adapted = adapted.replace(/FROM auth\.users/g, 'FROM public.users');
  adapted = adapted.replace(/JOIN auth\.users/g, 'JOIN public.users');
  adapted = adapted.replace(/TO authenticated/g, 'TO public');
  adapted = adapted.replace(/ROLE authenticated/g, 'ROLE public');

  // Удаляем ссылки на storage схему
  adapted = adapted.replace(/storage\.buckets/g, 'public.storage_buckets');
  adapted = adapted.replace(/storage\.objects/g, 'public.storage_objects');
  adapted = adapted.replace(/INSERT INTO storage\./g, '-- INSERT INTO storage.');
  adapted = adapted.replace(/CREATE POLICY.*storage\./g, '-- $&');

  // Комментируем RLS политики, которые используют auth функции
  adapted = adapted.replace(/CREATE POLICY "([^"]+)" ON ([^\s]+)\s+FOR (SELECT|INSERT|UPDATE|DELETE|ALL)\s+(USING|WITH CHECK)\s*\([^)]*auth\./g, 
    '-- CREATE POLICY "$1" ON $2 FOR $3 $4 (/* RLS policy removed - requires auth functions */');

  // Комментируем ALTER TYPE для document_type, если он уже создан в database_setup.sql
  adapted = adapted.replace(/ALTER TYPE document_type ADD VALUE/g, '-- ALTER TYPE document_type ADD VALUE');

  // Комментируем создание ENUM типов, если они уже созданы
  adapted = adapted.replace(/CREATE TYPE project_status AS ENUM/g, '-- CREATE TYPE project_status AS ENUM');
  adapted = adapted.replace(/CREATE TYPE document_type AS ENUM/g, '-- CREATE TYPE document_type AS ENUM');

  // Удаляем ENABLE ROW LEVEL SECURITY, если не нужен
  // Оставляем, но комментируем политики, которые используют auth

  return adapted;
}

console.log(`Найдено SQL файлов для адаптации: ${files.length}\n`);

let adaptedCount = 0;
let errorCount = 0;

for (const file of files) {
  try {
    const filePath = join(sqlDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const adapted = adaptSqlFile(content);
    
    if (content !== adapted) {
      writeFileSync(filePath, adapted, 'utf-8');
      console.log(`✅ Адаптирован: ${file}`);
      adaptedCount++;
    } else {
      console.log(`⏭️  Пропущен (не требует изменений): ${file}`);
    }
  } catch (error: any) {
    console.error(`❌ Ошибка в ${file}: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n✅ Адаптировано файлов: ${adaptedCount}`);
console.log(`❌ Ошибок: ${errorCount}`);


