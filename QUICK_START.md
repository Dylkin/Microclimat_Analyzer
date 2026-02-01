# 🚀 Быстрый старт - Microclimat Analyzer

Краткая инструкция для быстрого развертывания приложения.

## 📦 Шаг 1: Подготовка файлов

### На локальной машине разработки:

```bash
# Linux/macOS
./build-and-deploy.sh

# Windows
build-and-deploy.bat
```

Это создаст:
- Собранный frontend в папке `dist/`
- Архив для развертывания в папке `release/`

## 🖥️ Шаг 2: Развертывание на сервере

### Минимальные требования:

1. **Node.js 20.x**
2. **PostgreSQL 12+**
3. **Nginx** (для Linux) или **IIS** (для Windows)

### Быстрая установка (Linux):

```bash
# 1. Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 3. Создание БД
sudo -u postgres psql
CREATE DATABASE microclimat;
CREATE USER microclimat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE microclimat TO microclimat_user;
\q

# 4. Копирование проекта на сервер
# (скопируйте папки server/, supabase/, database_setup.sql, package.json)

# 5. Настройка бэкенда
cd /opt/microclimat  # или другая папка
npm install --production
cp .env.example .env
nano .env  # Настройте параметры БД

# 6. Настройка БД
npm run setup-db

# 7. Запуск бэкенда
sudo npm install -g pm2
pm2 start npm --name "microclimat-api" -- run server:prod
pm2 save
pm2 startup

# 8. Развертывание frontend
sudo mkdir -p /var/www/microclimat
cd /var/www/microclimat
unzip /path/to/microclimat_analyzer_YYYYMMDD_HHMM.zip -d current

# 9. Настройка Nginx
sudo nano /etc/nginx/sites-available/microclimat
# (см. DEPLOYMENT.md для конфигурации)

sudo ln -s /etc/nginx/sites-available/microclimat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ Шаг 3: Проверка

```bash
# Проверка API
curl http://localhost:3001/health

# Проверка frontend
curl http://localhost
```

## 📚 Подробная документация

Для детальных инструкций см.:
- **DEPLOYMENT.md** - полная инструкция по развертыванию
- **DEPLOYMENT_SERVER_INSTRUCTIONS.md** - краткая инструкция для сервера

## 🔧 Быстрые команды

```bash
# Перезапуск бэкенда
pm2 restart microclimat-api

# Просмотр логов
pm2 logs microclimat-api

# Перезапуск Nginx
sudo systemctl restart nginx

# Проверка статуса
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```


