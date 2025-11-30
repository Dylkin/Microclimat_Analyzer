import express from 'express';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = express.Router();

interface ReleaseInfo {
  version: string;
  commitHash: string;
  commitDate: string;
  buildDate: string;
  changelog: string[];
}

// GET /api/release/info - Получить информацию о релизе
router.get('/info', async (req, res) => {
  try {
    let commitHash = 'unknown';
    let commitDate = new Date().toISOString();
    let version = '0.0.0';
    const changelog: string[] = [];

    // Получаем commit hash
    try {
      commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.warn('Не удалось получить commit hash из git:', error);
    }

    // Получаем дату коммита
    try {
      const dateStr = execSync('git log -1 --format=%ci HEAD', { encoding: 'utf-8' }).trim();
      if (dateStr) {
        commitDate = new Date(dateStr).toISOString();
      }
    } catch (error) {
      console.warn('Не удалось получить дату коммита из git:', error);
    }

    // Получаем версию из package.json
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        version = packageJson.version || '0.0.0';
      }
    } catch (error) {
      console.warn('Не удалось прочитать package.json:', error);
    }

    // Если версия 0.0.0, генерируем версию на основе даты
    if (version === '0.0.0') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      version = `${year}.${month}.${day}`;
    }

    // Получаем changelog из файла или git log
    try {
      const changelogPath = join(process.cwd(), 'CHANGELOG.md');
      if (existsSync(changelogPath)) {
        const changelogContent = readFileSync(changelogPath, 'utf-8');
        // Парсим последние изменения (первые 10 строк после заголовка версии)
        const lines = changelogContent.split('\n');
        let inCurrentVersion = false;
        for (const line of lines) {
          if (line.startsWith('## ') || line.startsWith('# ')) {
            if (inCurrentVersion) break;
            inCurrentVersion = true;
            continue;
          }
          if (inCurrentVersion && line.trim().startsWith('-')) {
            changelog.push(line.trim().substring(1).trim());
            if (changelog.length >= 10) break;
          }
        }
      } else {
        // Если файла нет, получаем последние коммиты из git
        try {
          const gitLog = execSync('git log --oneline -10', { encoding: 'utf-8' }).trim();
          const commits = gitLog.split('\n').slice(0, 10);
          commits.forEach(commit => {
            const message = commit.substring(commit.indexOf(' ') + 1);
            if (message) {
              changelog.push(message);
            }
          });
        } catch (error) {
          console.warn('Не удалось получить changelog из git:', error);
        }
      }
    } catch (error) {
      console.warn('Ошибка при чтении changelog:', error);
    }

    // Если changelog пустой, добавляем дефолтное сообщение
    if (changelog.length === 0) {
      changelog.push('Обновление системы');
    }

    const releaseInfo: ReleaseInfo = {
      version,
      commitHash: commitHash.substring(0, 7), // Короткий hash
      commitDate,
      buildDate: new Date().toISOString(),
      changelog
    };

    res.json(releaseInfo);
  } catch (error: any) {
    console.error('Ошибка получения информации о релизе:', error);
    res.status(500).json({
      error: 'Ошибка получения информации о релизе',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

