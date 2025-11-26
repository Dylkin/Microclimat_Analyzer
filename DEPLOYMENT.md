# 🚀 Инструкция по развертыванию Microclimat Analyzer

Полная инструкция по развертыванию приложения на production-сервере.

## 📋 Содержание

1. [Предварительные требования](#предварительные-требования)
2. [Подготовка файлов для развертывания](#подготовка-файлов-для-развертывания)
3. [Развертывание на Linux сервере](#развертывание-на-linux-сервере)
4. [Развертывание на Windows Server](#развертывание-на-windows-server)
5. [Настройка базы данных PostgreSQL](#настройка-базы-данных-postgresql)
6. [Настройка бэкенд-сервера](#настройка-бэкенд-сервера)
7. [Настройка веб-сервера](#настройка-веб-сервера)
8. [Проверка работоспособности](#проверка-работоспособности)
9. [Обновление приложения](#обновление-приложения)
10. [Устранение неполадок](#устранение-неполадок)

---

## 🛠 Предварительные требования

### Для Linux (Ubuntu 20.04+/Debian 12+):

- Ubuntu 20.04+ или Debian 12+
- Доступ по SSH с правами sudo
- Минимум 2 GB RAM, 20 GB свободного места на диске
- Открытые порты: 80, 443, 3001 (или другой порт для API)

### Для Windows Server:

- Windows Server 2019+ или Windows 10/11
- Права администратора
- Минимум 2 GB RAM, 20 GB свободного места на диске
- Открытые порты: 80, 443, 3001 (или другой порт для API)

### Установленные компоненты:

**Linux:**
```bash
sudo apt update
sudo apt install -y curl wget unzip git
```

**Windows:**
- PowerShell 5.1+
- 7-Zip или встроенный архиватор

---

## 📦 Подготовка файлов для развертывания

### 1. Сборка проекта

На локальной машине разработки выполните:

```bash
# Установка зависимостей (если еще не установлены)
npm install

# Сборка frontend
npm run build

# Проверка наличия dist/ папки
ls -la dist/
```

### 2. Создание архива для развертывания

**Linux/macOS:**
```bash
# Создайте папку release, если её нет
mkdir -p release

# Создайте архив с датой и временем
cd dist
zip -r ../release/microclimat_analyzer_$(date +%Y%m%d_%H%M).zip .
cd ..
```

**Windows (PowerShell):**
```powershell
# Создайте папку release, если её нет
New-Item -ItemType Directory -Force -Path release

# Создайте архив с датой и временем
$date = Get-Date -Format "yyyyMMdd_HHmm"
Compress-Archive -Path dist\* -DestinationPath "release\microclimat_analyzer_$date.zip"
```

### 3. Файлы для передачи на сервер

Вам понадобятся следующие файлы:

1. **Архив frontend** (`release/microclimat_analyzer_YYYYMMDD_HHMM.zip`)
2. **Исходный код проекта** (для бэкенда и миграций):
   - `server/` - папка с бэкенд-кодом
   - `supabase/migrations/` - папка с миграциями БД
   - `database_setup.sql` - основной файл схемы БД
   - `package.json` - зависимости проекта
   - `.env.example` - пример файла переменных окружения

---

## 🐧 Развертывание на Linux сервере

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y curl wget unzip git build-essential
```

### Шаг 2: Установка Node.js

```bash
# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node --version  # Должно быть v20.x.x
npm --version
```

### Шаг 3: Установка PostgreSQL

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Проверка статуса
sudo systemctl status postgresql
```

### Шаг 4: Настройка базы данных

См. раздел [Настройка базы данных PostgreSQL](#настройка-базы-данных-postgresql)

### Шаг 5: Развертывание бэкенда

```bash
# Создайте директорию для приложения
sudo mkdir -p /opt/microclimat
sudo chown $USER:$USER /opt/microclimat

# Скопируйте проект на сервер (через scp или git clone)
# Например, через scp:
# scp -r server/ supabase/ database_setup.sql package.json .env.example user@server:/opt/microclimat/

# Или через git:
cd /opt/microclimat
git clone <your-repo-url> .
# или скопируйте файлы вручную

# Установка зависимостей
npm install --production

# Настройка переменных окружения
cp .env.example .env
nano .env  # Отредактируйте файл с вашими настройками
```

### Шаг 6: Развертывание frontend

```bash
# Создайте директорию для frontend
sudo mkdir -p /var/www/microclimat
sudo chown $USER:$USER /var/www/microclimat

# Скопируйте архив на сервер
# scp release/microclimat_analyzer_YYYYMMDD_HHMM.zip user@server:/tmp/

# Распакуйте архив
cd /var/www/microclimat
unzip /tmp/microclimat_analyzer_YYYYMMDD_HHMM.zip -d current
```

### Шаг 7: Настройка веб-сервера

См. раздел [Настройка веб-сервера](#настройка-веб-сервера)

### Шаг 8: Запуск бэкенда с PM2

```bash
# Установка PM2
sudo npm install -g pm2

# Запуск бэкенда
cd /opt/microclimat
pm2 start npm --name "microclimat-api" -- run server:prod

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска при перезагрузке
pm2 startup
# Выполните команду, которую выведет PM2
```

---

## 🪟 Развертывание на Windows Server

### Шаг 1: Подготовка сервера

1. Откройте PowerShell от имени администратора
2. Установите Chocolatey (если еще не установлен):
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Шаг 2: Установка Node.js

```powershell
# Через Chocolatey
choco install nodejs -y

# Или скачайте установщик с nodejs.org
# Проверка версии
node --version
npm --version
```

### Шаг 3: Установка PostgreSQL

```powershell
# Через Chocolatey
choco install postgresql -y

# Или скачайте установщик с postgresql.org
```

### Шаг 4: Настройка базы данных

См. раздел [Настройка базы данных PostgreSQL](#настройка-базы-данных-postgresql)

### Шаг 5: Развертывание бэкенда

```powershell
# Создайте директорию для приложения
New-Item -ItemType Directory -Force -Path C:\Microclimat

# Скопируйте проект на сервер
# Установка зависимостей
cd C:\Microclimat
npm install --production

# Настройка переменных окружения
Copy-Item .env.example .env
notepad .env  # Отредактируйте файл с вашими настройками
```

### Шаг 6: Развертывание frontend

```powershell
# Создайте директорию для frontend
New-Item -ItemType Directory -Force -Path C:\inetpub\microclimat

# Распакуйте архив
Expand-Archive -Path "C:\path\to\microclimat_analyzer_YYYYMMDD_HHMM.zip" -DestinationPath "C:\inetpub\microclimat\current" -Force
```

### Шаг 7: Настройка IIS

1. Откройте **Диспетчер IIS**
2. Создайте новый сайт:
   - Имя: `Microclimat Analyzer`
   - Физический путь: `C:\inetpub\microclimat\current`
   - Порт: `80` (или другой)
3. Установите **URL Rewrite Module** (если еще не установлен)
4. Добавьте правило переписывания URL:
   - Pattern: `(.*)`
   - Rewrite URL: `/index.html`
5. Настройте MIME-типы для `.js`, `.css`, `.woff2`, `.svg`

### Шаг 8: Запуск бэкенда как службы Windows

```powershell
# Установка PM2 для Windows
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# Запуск бэкенда
cd C:\Microclimat
pm2 start npm --name "microclimat-api" -- run server:prod
pm2 save
```

---

## 🗄️ Настройка базы данных PostgreSQL

### Шаг 1: Создание базы данных и пользователя

**Linux:**
```bash
sudo -u postgres psql
```

**Windows:**
Откройте **SQL Shell (psql)** или **pgAdmin**

**SQL команды:**
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

### Шаг 2: Применение миграций

**Автоматический способ (рекомендуется):**

```bash
cd /opt/microclimat  # или C:\Microclimat на Windows

# Настройте .env файл с параметрами БД
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=microclimat
# DB_USER=microclimat_user
# DB_PASSWORD=your_secure_password_here

# Применение всех миграций и добавление тестовых логгеров
npm run setup-db
```

Скрипт `setup-db` автоматически:
- ✅ Применит основной файл `database_setup.sql`
- ✅ Применит все миграции из `supabase/migrations/`
- ✅ Добавит 100 логгеров Testo 174T (DL-001 до DL-100)
- ✅ Добавит 100 логгеров Testo 174H (DL-201 до DL-300)
- ✅ Безопасен для повторного запуска (идемпотентен)

**Альтернативный способ (только миграции):**

```bash
npm run migrate
```

**Ручной способ:**

```bash
# Применение основного файла
psql -U microclimat_user -d microclimat -f database_setup.sql

# Применение миграций (если нужно)
# psql -U microclimat_user -d microclimat -f supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
```

### Шаг 3: Проверка базы данных

```bash
psql -U microclimat_user -d microclimat -c "\dt"
```

Должны быть созданы таблицы: `users`, `contractors`, `projects`, `qualification_objects`, и т.д.

---

## 🖥️ Настройка бэкенд-сервера

### Шаг 1: Создание файла `.env`

Создайте файл `.env` в корне проекта (рядом с `package.json`):

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

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET=your_jwt_secret_here_min_32_chars

# CORS (если frontend на другом домене)
CORS_ORIGIN=https://your-domain.com
```

**Генерация JWT_SECRET:**
```bash
# Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Шаг 2: Создание директории для загрузок

```bash
# Linux
sudo mkdir -p /opt/microclimat/uploads
sudo chown $USER:$USER /opt/microclimat/uploads

# Windows
New-Item -ItemType Directory -Force -Path C:\Microclimat\uploads
```

### Шаг 3: Запуск бэкенда

**Разработка:**
```bash
npm run server
```

**Production (с PM2):**
```bash
pm2 start npm --name "microclimat-api" -- run server:prod
pm2 save
```

**Проверка:**
```bash
curl http://localhost:3001/health
# Должен вернуть: {"status":"ok"}
```

---

## 🌐 Настройка веб-сервера

### Nginx (Linux)

#### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

#### 2. Создание конфигурации

Создайте файл `/etc/nginx/sites-available/microclimat`:

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/microclimat/current;
    index index.html;

    # Логи
    access_log /var/log/nginx/microclimat-access.log;
    error_log /var/log/nginx/microclimat-error.log;

    # Frontend (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API проксирование
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

    # Загрузка файлов
    location /uploads {
        alias /opt/microclimat/uploads;
        add_header Access-Control-Allow-Origin *;
    }
}
```

#### 3. Активирование сайта

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/microclimat /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

#### 4. Настройка HTTPS (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автоматическое обновление (уже настроено в cron)
```

### IIS (Windows Server)

1. Откройте **Диспетчер IIS**
2. Установите **URL Rewrite Module** (если еще не установлен)
3. Создайте сайт:
   - Имя: `Microclimat Analyzer`
   - Физический путь: `C:\inetpub\microclimat\current`
   - Привязка: `http`, порт `80`
4. Добавьте правило переписывания URL:
   - Pattern: `(.*)`
   - Rewrite URL: `/index.html`
5. Настройте проксирование для `/api` на `http://localhost:3001`
6. Настройте MIME-типы для статических файлов

---

## ✅ Проверка работоспособности

### 1. Проверка frontend

Откройте в браузере:
- `http://your-domain.com` (или `https://your-domain.com`)

Должна загрузиться страница входа в систему.

### 2. Проверка API

```bash
# Health check
curl http://localhost:3001/health
# Ожидаемый ответ: {"status":"ok"}

# Проверка через Nginx
curl http://your-domain.com/api/health
```

### 3. Проверка базы данных

```bash
# Подключение к БД
psql -U microclimat_user -d microclimat

# Проверка таблиц
\dt

# Проверка логгеров
SELECT COUNT(*) FROM measurement_equipment WHERE type IN ('Testo 174T', 'Testo 174H');
# Должно быть 200 записей

\q
```

### 4. Проверка загрузки файлов

```bash
# Проверка директории uploads
ls -la /opt/microclimat/uploads  # Linux
dir C:\Microclimat\uploads        # Windows
```

---

## 🔄 Обновление приложения

### Обновление frontend

```bash
# На сервере
cd /var/www/microclimat

# Создайте резервную копию текущей версии
cp -r current current_backup_$(date +%Y%m%d)

# Распакуйте новую версию
unzip /tmp/microclimat_analyzer_NEW_VERSION.zip -d releases/$(date +%Y%m%d)

# Переключите симлинк
rm current
ln -s releases/$(date +%Y%m%d) current

# Перезагрузите Nginx
sudo systemctl reload nginx
```

### Обновление бэкенда

```bash
# На сервере
cd /opt/microclimat

# Остановите бэкенд
pm2 stop microclimat-api

# Обновите код (через git или копирование файлов)
git pull  # или скопируйте новые файлы

# Установите новые зависимости
npm install --production

# Примените новые миграции (если есть)
npm run migrate

# Запустите бэкенд
pm2 restart microclimat-api
```

---

## 🔧 Устранение неполадок

### Проблема: Frontend не загружается

**Решение:**
1. Проверьте права доступа к файлам: `ls -la /var/www/microclimat/current`
2. Проверьте конфигурацию Nginx: `sudo nginx -t`
3. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`

### Проблема: API не отвечает

**Решение:**
1. Проверьте статус PM2: `pm2 status`
2. Проверьте логи PM2: `pm2 logs microclimat-api`
3. Проверьте порт: `netstat -tulpn | grep 3001`
4. Проверьте файл `.env` и параметры подключения к БД

### Проблема: Ошибки подключения к БД

**Решение:**
1. Проверьте статус PostgreSQL: `sudo systemctl status postgresql`
2. Проверьте параметры в `.env`
3. Проверьте доступность БД: `psql -U microclimat_user -d microclimat -c "SELECT 1"`

### Проблема: Файлы не загружаются

**Решение:**
1. Проверьте права доступа к папке `uploads`: `ls -la /opt/microclimat/uploads`
2. Проверьте конфигурацию Nginx для `/uploads`
3. Проверьте логи бэкенда на ошибки загрузки

### Проблема: Миграции не применяются

**Решение:**
1. Проверьте подключение к БД
2. Проверьте логи миграций: `npm run migrate` (с выводом ошибок)
3. Примените миграции вручную: `psql -U microclimat_user -d microclimat -f supabase/migrations/...`

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи:
   - Nginx: `/var/log/nginx/error.log`
   - PM2: `pm2 logs microclimat-api`
   - PostgreSQL: `/var/log/postgresql/postgresql-*.log`

2. Проверьте документацию:
   - `DEPLOYMENT_SERVER_INSTRUCTIONS.md` - краткая инструкция
   - `MIGRATIONS_README.md` - информация о миграциях
   - `README.md` - общая информация о проекте

3. Создайте issue в репозитории проекта с описанием проблемы и логами

---

## 📝 Чеклист развертывания

- [ ] Установлен Node.js 20.x
- [ ] Установлен PostgreSQL
- [ ] Создана база данных и пользователь
- [ ] Применены миграции БД (`npm run setup-db`)
- [ ] Настроен файл `.env` для бэкенда
- [ ] Создана папка `uploads` с правильными правами
- [ ] Развернут frontend в `/var/www/microclimat/current`
- [ ] Настроен веб-сервер (Nginx/IIS)
- [ ] Настроен reverse proxy для API
- [ ] Запущен бэкенд через PM2
- [ ] Настроен HTTPS (опционально, но рекомендуется)
- [ ] Проверена работоспособность всех компонентов
- [ ] Настроено резервное копирование БД

---

**Дата создания:** 2025-01-XX  
**Версия:** 1.0


