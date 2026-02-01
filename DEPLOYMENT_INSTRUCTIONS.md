# Инструкция по развертыванию приложения Microclimat Analyzer

## 📋 Содержание

1. [Требования к системе](#требования-к-системе)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка зависимостей](#установка-зависимостей)
4. [Настройка базы данных](#настройка-базы-данных)
5. [Настройка приложения](#настройка-приложения)
6. [Сборка и запуск](#сборка-и-запуск)
7. [Настройка веб-сервера](#настройка-веб-сервера)
8. [Настройка автозапуска](#настройка-автозапуска)
9. [Резервное копирование](#резервное-копирование)
10. [Обновление приложения](#обновление-приложения)

---

## 🔧 Требования к системе

### Минимальные требования:
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Windows Server 2019+
- **CPU**: 2 ядра
- **RAM**: 4 GB
- **Диск**: 20 GB свободного места
- **Node.js**: версия 18.x или выше
- **PostgreSQL**: версия 13.x или выше
- **Nginx**: версия 1.18+ (для Linux) или IIS (для Windows)

### Рекомендуемые требования:
- **CPU**: 4+ ядра
- **RAM**: 8+ GB
- **Диск**: 50+ GB SSD

---

## 🖥️ Подготовка сервера

### Для Linux (Ubuntu/Debian):

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
sudo apt install -y nginx

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка дополнительных инструментов
sudo apt install -y git build-essential
```

### Для Windows Server:

1. Установите Node.js с официального сайта: https://nodejs.org/
2. Установите PostgreSQL: https://www.postgresql.org/download/windows/
3. Установите Nginx для Windows или используйте IIS
4. Установите PM2 глобально: `npm install -g pm2`

---

## 📦 Установка зависимостей

### 1. Распакуйте архив на сервере

```bash
# Linux
cd /opt
sudo mkdir -p microclimat-analyzer
sudo chown $USER:$USER microclimat-analyzer
cd microclimat-analyzer
# Распакуйте архив сюда

# Windows
# Распакуйте архив в C:\Microclimat_Analyzer
```

### 2. Установите зависимости проекта

```bash
cd /opt/microclimat-analyzer  # или C:\Microclimat_Analyzer на Windows
npm install
```

Если возникают ошибки, попробуйте:
```bash
npm install --legacy-peer-deps
```

---

## 🗄️ Настройка базы данных

### 1. Создание базы данных и пользователя

```bash
# Подключитесь к PostgreSQL как суперпользователь
sudo -u postgres psql  # Linux
# или
psql -U postgres  # Windows
```

Выполните следующие SQL команды:

```sql
-- Создание базы данных
CREATE DATABASE microclimat;

-- Создание пользователя
CREATE USER microclimat_user WITH PASSWORD 'your_secure_password_here';

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE microclimat TO microclimat_user;

-- Выход
\q
```

### 2. Применение миграций

```bash
# Перейдите в директорию проекта
cd /opt/microclimat-analyzer

# Примените все миграции
npm run migrate
```

Или вручную:

```bash
# Примените каждую миграцию по порядку
psql -U microclimat_user -d microclimat -f supabase/migrations/20250101000000_add_qualification_objects_file_fields.sql
psql -U microclimat_user -d microclimat -f supabase/migrations/20250101000001_create_project_qualification_objects.sql
# ... и так далее для всех миграций
```

**Важно**: Применяйте миграции в порядке их даты (по имени файла).

### 3. Проверка базы данных

```bash
psql -U microclimat_user -d microclimat -c "\dt"
```

Должны быть созданы все необходимые таблицы.

---

## ⚙️ Настройка приложения

### 1. Создание файла `.env`

Создайте файл `.env` в корне проекта:

```bash
nano .env  # Linux
# или
notepad .env  # Windows
```

Содержимое файла `.env`:

```env
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microclimat
DB_USER=microclimat_user
DB_PASSWORD=your_secure_password_here

# Сервер
PORT=3001
NODE_ENV=production

# CORS (если frontend на другом домене)
CORS_ORIGIN=https://your-domain.com
# или для локального тестирования
# CORS_ORIGIN=http://localhost:5173
```

**⚠️ ВАЖНО**: 
- Замените `your_secure_password_here` на реальный пароль из шага создания пользователя БД
- Убедитесь, что файл `.env` не попал в систему контроля версий (добавьте в `.gitignore`)

### 2. Создание директории для загрузок

```bash
# Linux
sudo mkdir -p /opt/microclimat-analyzer/uploads
sudo chown $USER:$USER /opt/microclimat-analyzer/uploads
sudo chmod 755 /opt/microclimat-analyzer/uploads

# Windows
New-Item -ItemType Directory -Force -Path C:\Microclimat_Analyzer\uploads
```

### 3. Настройка прав доступа (Linux)

```bash
# Убедитесь, что у пользователя есть права на запись
sudo chown -R $USER:$USER /opt/microclimat-analyzer
sudo chmod -R 755 /opt/microclimat-analyzer
```

---

## 🏗️ Сборка и запуск

### 1. Сборка frontend

```bash
cd /opt/microclimat-analyzer
npm run build
```

Результат будет в папке `dist/`.

### 2. Запуск backend сервера

#### Вариант 1: С использованием PM2 (рекомендуется)

```bash
# Запуск
pm2 start npm --name "microclimat-api" -- run server:prod

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска
pm2 startup
# Выполните команду, которую выведет PM2
```

#### Вариант 2: Ручной запуск

```bash
npm run server:prod
```

#### Вариант 3: Windows Service (Windows)

Создайте файл `start-server.bat`:

```batch
@echo off
cd /d C:\Microclimat_Analyzer
npm run server:prod
```

Или используйте PM2 для Windows.

### 3. Проверка работы сервера

Откройте в браузере или выполните:

```bash
curl http://localhost:3001/health
```

Должен вернуться JSON:
```json
{"status":"ok","database":"connected"}
```

---

## 🌐 Настройка веб-сервера

### Вариант 1: Nginx (Linux, рекомендуется)

#### 1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/microclimat-analyzer
```

Содержимое:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен или IP

    # Логи
    access_log /var/log/nginx/microclimat-access.log;
    error_log /var/log/nginx/microclimat-error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 100M;

    # Frontend (статичные файлы)
    location / {
        root /opt/microclimat-analyzer/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Загруженные файлы
    location /uploads {
        alias /opt/microclimat-analyzer/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
    }
}
```

#### 2. Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/microclimat-analyzer /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

#### 3. Настройка SSL (опционально, рекомендуется)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

### Вариант 2: IIS (Windows Server)

1. Установите IIS и URL Rewrite модуль
2. Создайте новый сайт, указывающий на папку `dist`
3. Настройте reverse proxy для `/api` на `http://localhost:3001`
4. Настройте статические файлы для `/uploads`

---

## 🔄 Настройка автозапуска

### Linux (systemd)

Создайте файл `/etc/systemd/system/microclimat-api.service`:

```ini
[Unit]
Description=Microclimat Analyzer API Server
After=network.target postgresql.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/opt/microclimat-analyzer
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run server:prod
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Активация:

```bash
sudo systemctl daemon-reload
sudo systemctl enable microclimat-api
sudo systemctl start microclimat-api
sudo systemctl status microclimat-api
```

### Windows (Task Scheduler)

1. Откройте Планировщик заданий
2. Создайте новое задание
3. Триггер: "При входе в систему"
4. Действие: Запустить программу `npm.cmd` с аргументами `run server:prod` в рабочей папке `C:\Microclimat_Analyzer`

---

## 💾 Резервное копирование

### Резервное копирование базы данных

Создайте скрипт `backup-db.sh` (Linux) или `backup-db.bat` (Windows):

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/opt/backups/microclimat"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U microclimat_user -d microclimat > $BACKUP_DIR/microclimat_$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: microclimat_$DATE.sql"
```

Настройте cron для ежедневного бэкапа:

```bash
# Редактирование crontab
crontab -e

# Добавьте строку (бэкап каждый день в 2:00)
0 2 * * * /opt/microclimat-analyzer/backup-db.sh
```

### Резервное копирование загруженных файлов

```bash
# Создание архива
tar -czf /opt/backups/microclimat/uploads_$(date +%Y%m%d).tar.gz /opt/microclimat-analyzer/uploads
```

---

## 🔄 Обновление приложения

### Процесс обновления:

1. **Остановите сервер:**
   ```bash
   pm2 stop microclimat-api
   # или
   sudo systemctl stop microclimat-api
   ```

2. **Создайте резервную копию:**
   ```bash
   # БД
   pg_dump -U microclimat_user -d microclimat > backup_before_update.sql
   
   # Файлы
   tar -czf uploads_backup.tar.gz uploads/
   ```

3. **Распакуйте новую версию:**
   ```bash
   # Сохраните старый .env
   cp .env .env.backup
   
   # Распакуйте новый архив
   # ...
   
   # Восстановите .env
   cp .env.backup .env
   ```

4. **Установите зависимости:**
   ```bash
   npm install
   ```

5. **Примените новые миграции:**
   ```bash
   npm run migrate
   ```

6. **Пересоберите frontend:**
   ```bash
   npm run build
   ```

7. **Запустите сервер:**
   ```bash
   pm2 restart microclimat-api
   # или
   sudo systemctl start microclimat-api
   ```

8. **Проверьте работу:**
   ```bash
   curl http://localhost:3001/health
   ```

---

## 🐛 Решение проблем

### Проблема: Сервер не запускается

1. Проверьте логи:
   ```bash
   pm2 logs microclimat-api
   # или
   sudo journalctl -u microclimat-api -f
   ```

2. Проверьте подключение к БД:
   ```bash
   psql -U microclimat_user -d microclimat -c "SELECT 1;"
   ```

3. Проверьте переменные окружения:
   ```bash
   cat .env
   ```

### Проблема: Ошибки при сборке

1. Очистите кэш:
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. Проверьте версию Node.js:
   ```bash
   node --version  # Должна быть 18.x или выше
   ```

### Проблема: 404 на frontend

1. Проверьте, что файлы в `dist/` существуют
2. Проверьте конфигурацию Nginx (путь к `dist`)
3. Проверьте права доступа к файлам

### Проблема: Ошибки подключения к API

1. Проверьте, что backend запущен:
   ```bash
   curl http://localhost:3001/health
   ```

2. Проверьте конфигурацию прокси в Nginx
3. Проверьте CORS настройки в `.env`

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи приложения
2. Проверьте логи веб-сервера (Nginx/IIS)
3. Проверьте логи базы данных PostgreSQL
4. Убедитесь, что все сервисы запущены

---

## ✅ Чеклист развертывания

- [ ] Установлены все зависимости системы (Node.js, PostgreSQL, Nginx)
- [ ] Создана база данных и пользователь
- [ ] Применены все миграции
- [ ] Создан файл `.env` с правильными настройками
- [ ] Создана директория `uploads` с правильными правами
- [ ] Собран frontend (`npm run build`)
- [ ] Запущен backend сервер
- [ ] Настроен веб-сервер (Nginx/IIS)
- [ ] Настроен автозапуск
- [ ] Настроено резервное копирование
- [ ] Проверена работа приложения

---

**Дата создания инструкции**: 2025-01-02  
**Версия приложения**: 1.0.0




