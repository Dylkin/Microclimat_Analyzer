# Найденные данные для деплоя / подключения к продакшену

> Сводка собрана из файлов каталога приложения. Пароли и чувствительные значения не публикуются — указаны файлы, где они хранятся.

---

## 1. SSH-подключение к прод-серверу

| Параметр | Значение | Источник |
|----------|----------|----------|
| Хост | `stas@192.168.98.42` | `deploy.env`, `setup-ssh-key.bat`, `create-deployment-package.sh/.bat` |
| SSH-ключ | `%USERPROFILE%\.ssh\id_rsa` → на Windows bash `/c/Users/User/.ssh/id_rsa` | `deploy.env`, `setup-ssh-key.bat` |
| Sudo-пароль | хранится в `bd.env` (SUDO_PASSWORD) | `bd.env` |

Проверка подключения:
```bash
ssh -i /c/Users/User/.ssh/id_rsa stas@192.168.98.42
```

---

## 2. Расположение проекта на сервере

| Параметр | Значение | Источник |
|----------|----------|----------|
| Директория проекта | `/opt/Microclimat_Analyzer` | найдено на сервере, зафиксировано в `ecosystem.config.cjs` |
| Старый путь (устаревший) | `/home/stas/Microclimat_Analyzer` | `create-deployment-package.sh/.bat`, `deploy-production-ubuntu24.sh` |
| Frontend (сборка) | `/opt/Microclimat_Analyzer/dist` | `npm run build` |
| Загрузки | `/opt/Microclimat_Analyzer/uploads` | настройка Nginx / приложения |

---

## 3. База данных PostgreSQL

Переменные окружения (из `.env` на сервере, значения по умолчанию в `server/config/database.ts`):

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `DB_HOST` | `localhost` | хост БД |
| `DB_PORT` | `5432` | порт БД |
| `DB_NAME` | `microclimat` | имя базы |
| `DB_USER` | `postgres` | пользователь БД |
| `DB_PASSWORD` | — | пароль (в `.env`) |

Pool-config: max 20 соединений, idle 30s, connection timeout 2s.

---

## 4. Backend / PM2

| Параметр | Значение | Источник |
|----------|----------|----------|
| Имя процесса PM2 | `microclimat-api` | `ecosystem.config.cjs` |
| Команда запуска | `npm run server:prod` | `ecosystem.config.cjs` |
| CWD | `/opt/Microclimat_Analyzer` | `ecosystem.config.cjs` |
| Порт API | `3001` (из `.env` `PORT`) | `server/index.ts`, `vite.config.ts` |
| NODE_ENV | `production` | `ecosystem.config.cjs` |
| Логи PM2 | `/home/stas/.pm2/logs/microclimat-api-*.log` | `ecosystem.config.cjs` |
| Health check | `http://localhost:3001/health` | `server/index.ts` |

Полезные команды:
```bash
pm2 status
pm2 logs microclimat-api --lines 100
pm2 restart microclimat-api
```

---

## 5. Frontend / Vite

| Параметр | Значение | Источник |
|----------|----------|----------|
| Dev server port | `5173` | `vite.config.ts` |
| Preview port | `4173` | `vite.config.ts` |
| API proxy target | `VITE_API_PROXY_TARGET` или `http://127.0.0.1:3001` | `vite.config.ts` |
| Production build | `dist/` | `package.json` → `npm run build` |

---

## 6. Почта

Переменные окружения (из `server/services/mailSettings.ts`):

| Переменная | Значение по умолчанию |
|------------|----------------------|
| `MAIL_COMPANY_NAME` | `ОДО «Комсистем»` |
| `MAIL_FROM` / `MAIL_USER` | — |
| `MAIL_HOST` | `smtp.example.com` |
| `MAIL_PORT` | `587` |
| `MAIL_SECURE` | `false` |
| `MAIL_PASSWORD` | — |
| `MAIL_IMAP_HOST` | `MAIL_HOST` или `imap.example.com` |
| `MAIL_IMAP_PORT` | `993` |
| `MAIL_IMAP_SECURE` | `true` |
| `MAIL_IMAP_USER` | `MAIL_USER` |
| `MAIL_IMAP_PASSWORD` | `MAIL_PASSWORD` |

---

## 7. Скрипты деплоя / обновления

| Скрипт | Назначение |
|--------|-----------|
| `update-prod.sh` | Полное обновление продакшена: backup, git pull, npm install, setup-db, build, restart services |
| `build-and-deploy.sh` | Локальная сборка frontend и создание архива `release/` |
| `create-deployment-package.sh/.bat` | Создание пакета для развёртывания |
| `deploy-production-ubuntu24.sh` | Развёртывание с нуля на Ubuntu 24 |
| `setup-ssh-key.bat` | Настройка SSH-ключа для `stas@192.168.98.42` |

---

## 8. Файлы с секретами / чувствительными данными

Эти файлы не включены в Git (`.gitignore`) и должны храниться локально на сервере:

- `.env` — основной конфиг с паролями БД, JWT, почтой, CORS и т.д.
- `.env.development` — dev-конфиг (содержит секреты).
- `.env.production` — production-конфиг (содержит секреты).
- `bd.env` — sudo-пароль для сервера.
- `deploy.env` — SSH-хост и путь к ключу.
- `%USERPROFILE%\.ssh\id_rsa` — приватный SSH-ключ.

---

## 9. Nginx

На сервере настроен Nginx:
- root: `/opt/Microclimat_Analyzer/dist`
- API proxy: `/api` → `http://localhost:3001`
- uploads: `/uploads` → `/opt/Microclimat_Analyzer/uploads`
- client_max_body_size: 200M

Команды проверки/перезагрузки:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

*Дата сборки:* 2026-07-17
