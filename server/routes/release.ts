import express from 'express';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = express.Router();

interface ReleaseInfo {
  commitHash: string;
  commitDate: string;
  buildDate: string;
  changes: string;
}

// GET /api/release/info - Получить информацию о последних 5 релизах
router.get('/info', async (req, res) => {
  console.log('=== НОВЫЙ КОД ВЫПОЛНЯЕТСЯ ===');
  console.log('Запрос к /api/release/info получен');
  try {
    const releases: ReleaseInfo[] = [];
    const projectDir = process.cwd();
    console.log('Инициализирован массив releases, projectDir:', projectDir);

    // Получаем последние 5 коммитов с информацией
    try {
      // Формат: hash|date|message
      // Указываем рабочую директорию и добавляем обработку ошибок
      console.log('Попытка получить git log из директории:', projectDir);
      // Используем одинарные кавычки для экранирования формата
      const gitLog = execSync("git log -5 --format='%H|%ci|%s'", { 
        encoding: 'utf-8',
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: '/bin/bash'
      }).trim();
      
      console.log('Git log получен, длина:', gitLog.length);
      const commits = gitLog.split('\n').filter(line => line.trim());
      console.log('Найдено коммитов:', commits.length);

      commits.forEach((commitLine) => {
        const parts = commitLine.split('|');
        if (parts.length >= 3) {
          const commitHash = parts[0].trim();
          const commitDateStr = parts[1].trim();
          const commitMessage = parts.slice(2).join('|').trim();

          // Парсим дату коммита
          let commitDate = new Date().toISOString();
          try {
            commitDate = new Date(commitDateStr).toISOString();
          } catch (error) {
            console.warn('Ошибка парсинга даты коммита:', commitDateStr, error);
          }

          // Дата сборки - используем дату коммита (или можно использовать текущую дату)
          const buildDate = commitDate;

          releases.push({
            commitHash: commitHash.substring(0, 7), // Короткий hash
            commitDate,
            buildDate,
            changes: commitMessage || 'Обновление системы'
          });
        } else {
          console.warn('Неверный формат строки коммита:', commitLine);
        }
      });
    } catch (error: any) {
      console.error('Не удалось получить информацию из git:', error);
      console.error('Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        signal: error?.signal,
        stderr: error?.stderr?.toString(),
        stdout: error?.stdout?.toString()
      });
      // Если git недоступен, создаем одну запись с текущей датой
      releases.push({
        commitHash: 'unknown',
        commitDate: new Date().toISOString(),
        buildDate: new Date().toISOString(),
        changes: 'Информация о коммитах недоступна'
      });
    }

    // Если нет релизов, добавляем дефолтный
    if (releases.length === 0) {
      releases.push({
        commitHash: 'unknown',
        commitDate: new Date().toISOString(),
        buildDate: new Date().toISOString(),
        changes: 'Нет информации о релизах'
      });
    }

    // Сортируем по дате коммита (более поздние вверху)
    releases.sort((a, b) => {
      const dateA = new Date(a.commitDate).getTime();
      const dateB = new Date(b.commitDate).getTime();
      return dateB - dateA; // По убыванию (новые сверху)
    });

    console.log('Отправка релизов, количество:', releases.length, 'тип:', Array.isArray(releases) ? 'array' : typeof releases);
    console.log('Первый релиз:', releases[0] ? JSON.stringify(releases[0]) : 'нет');
    res.json(releases);
  } catch (error: any) {
    console.error('Ошибка получения информации о релизах:', error);
    res.status(500).json({
      error: 'Ошибка получения информации о релизах',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

