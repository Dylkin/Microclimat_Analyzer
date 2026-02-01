import { pool } from '../config/database.js';
import * as dotenv from 'dotenv';
import { v5 as uuidv5 } from 'uuid';

dotenv.config();

// Миграция: обновление UUID пользователя по умолчанию с версии 0 на версию 5
const OLD_UUID = '00000000-0000-0000-0000-000000000001';
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'pavel.dylkin@gmail.com';
const NEW_UUID = uuidv5(DEFAULT_ADMIN_EMAIL, DNS_NAMESPACE);

async function migrateDefaultUserUUID() {
  try {
    console.log('Начало миграции UUID пользователя по умолчанию...');
    console.log(`Старый UUID: ${OLD_UUID}`);
    console.log(`Новый UUID (v5): ${NEW_UUID}`);

    // Проверяем, существует ли пользователь со старым UUID
    const checkOldResult = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [OLD_UUID]
    );

    if (checkOldResult.rows.length === 0) {
      console.log('⚠️ Пользователь со старым UUID не найден. Проверяем новый UUID...');
      
      // Проверяем, существует ли пользователь с новым UUID
      const checkNewResult = await pool.query(
        'SELECT id, email, full_name, role FROM users WHERE id = $1',
        [NEW_UUID]
      );

      if (checkNewResult.rows.length > 0) {
        console.log('✅ Пользователь с новым UUID уже существует. Миграция не требуется.');
        await pool.end();
        return;
      } else {
        console.log('⚠️ Пользователь не найден ни со старым, ни с новым UUID.');
        console.log('💡 Запустите npm run create-default-user для создания пользователя.');
        await pool.end();
        return;
      }
    }

    const oldUser = checkOldResult.rows[0];
    console.log('Найден пользователь со старым UUID:', oldUser);

    // Проверяем, существует ли пользователь с новым UUID
    const checkNewResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [NEW_UUID]
    );

    if (checkNewResult.rows.length > 0) {
      console.log('⚠️ Пользователь с новым UUID уже существует. Удаляем старую запись...');
      
      // Удаляем старую запись
      await pool.query('DELETE FROM users WHERE id = $1', [OLD_UUID]);
      console.log('✅ Старая запись удалена.');
    } else {
      console.log('Обновление UUID пользователя...');
      
      // Используем транзакцию для атомарности
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Временно отключаем проверку внешних ключей
        await client.query('SET session_replication_role = replica');
        
        // Обновляем UUID пользователя
        // Сначала обновляем все связанные таблицы, которые могут ссылаться на users.id
        // Затем обновляем сам users
        
        // Обновляем все таблицы, которые ссылаются на users.id
        // Используем SAVEPOINT для каждой операции, чтобы ошибки не прерывали транзакцию
      
      // project_stage_assignments.assigned_by
      try {
        await client.query('SAVEPOINT sp_project_stage_assignments');
        const result1 = await client.query(
          'UPDATE project_stage_assignments SET assigned_by = $1 WHERE assigned_by = $2',
          [NEW_UUID, OLD_UUID]
        );
        console.log(`✅ Обновлены project_stage_assignments: ${result1.rowCount} записей`);
        await client.query('RELEASE SAVEPOINT sp_project_stage_assignments');
      } catch (error: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_project_stage_assignments');
        console.warn('⚠️ Ошибка обновления project_stage_assignments (таблица может не существовать):', error.message);
      }

      // qualification_work_schedule.completed_by
      try {
        await client.query('SAVEPOINT sp_qualification_work_schedule');
        const result2 = await client.query(
          'UPDATE qualification_work_schedule SET completed_by = $1 WHERE completed_by = $2',
          [NEW_UUID, OLD_UUID]
        );
        console.log(`✅ Обновлены qualification_work_schedule: ${result2.rowCount} записей`);
        await client.query('RELEASE SAVEPOINT sp_qualification_work_schedule');
      } catch (error: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_qualification_work_schedule');
        console.warn('⚠️ Ошибка обновления qualification_work_schedule (таблица может не существовать):', error.message);
      }

      // projects.created_by
      try {
        await client.query('SAVEPOINT sp_projects');
        const result3 = await client.query(
          'UPDATE projects SET created_by = $1 WHERE created_by = $2',
          [NEW_UUID, OLD_UUID]
        );
        console.log(`✅ Обновлены projects: ${result3.rowCount} записей`);
        await client.query('RELEASE SAVEPOINT sp_projects');
      } catch (error: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_projects');
        console.warn('⚠️ Ошибка обновления projects (таблица может не существовать):', error.message);
      }

      // audit_logs.user_id
      try {
        await client.query('SAVEPOINT sp_audit_logs');
        const result4 = await client.query(
          'UPDATE audit_logs SET user_id = $1 WHERE user_id = $2',
          [NEW_UUID, OLD_UUID]
        );
        console.log(`✅ Обновлены audit_logs: ${result4.rowCount} записей`);
        await client.query('RELEASE SAVEPOINT sp_audit_logs');
      } catch (error: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_audit_logs');
        console.warn('⚠️ Ошибка обновления audit_logs (таблица может не существовать):', error.message);
      }

      // Другие таблицы, которые могут ссылаться на users.id
      // Добавьте здесь другие таблицы по необходимости

      // Обновляем сам users
      await client.query(
        'UPDATE users SET id = $1 WHERE id = $2',
        [NEW_UUID, OLD_UUID]
      );
      console.log('✅ UUID пользователя обновлен в таблице users');
      
      // Включаем обратно проверку внешних ключей
      await client.query('SET session_replication_role = DEFAULT');
      
      // Коммитим транзакцию
      await client.query('COMMIT');
      console.log('✅ Транзакция успешно завершена');
      
      // Проверяем результат
      const verifyResult = await client.query(
        'SELECT id, email, full_name, role, is_default FROM users WHERE id = $1',
        [NEW_UUID]
      );

      if (verifyResult.rows.length > 0) {
        console.log('✅ Миграция завершена успешно!');
        console.log('Новый пользователь:', verifyResult.rows[0]);
      } else {
        console.error('❌ Ошибка: пользователь не найден после миграции');
      }
      } catch (error: any) {
        // Откатываем транзакцию в случае ошибки
        await client.query('ROLLBACK');
        console.error('❌ Ошибка миграции, транзакция откачена:', error.message);
        throw error;
      } finally {
        client.release();
      }
    }

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка миграции:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

migrateDefaultUserUUID();

