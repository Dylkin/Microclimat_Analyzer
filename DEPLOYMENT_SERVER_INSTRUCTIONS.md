## 📦 Готовый дистрибутив

Для создания архива для развертывания используйте скрипты:

**Linux/macOS:**
```bash
./build-and-deploy.sh
```

**Windows:**
```cmd
build-and-deploy.bat
```

Скрипты автоматически:
- ✅ Установят зависимости
- ✅ Соберут frontend
- ✅ Создадут архив в папке `release/` с датой и временем
- ✅ Создадут файл с информацией о сборке

Архив будет содержать production-сборку из `dist/`, готовую к размещению на статическом веб-сервере.

**Важно:** URL бэкенд-сервера и прочие переменные были зашиты при сборке. Если нужно изменить их значения, обновите `.env` и выполните `npm run build` заново перед упаковкой.

---

## 🛠 Предварительные требования

- Сервер с Ubuntu 20.04+/Debian 12+ или Windows Server 2019+.
- Доступ по SSH/WinRM и права администратора.
- Установлены: `curl`, `wget`, `unzip` (Linux) или 7-Zip (Windows).
- Домен, указывающий на сервер, и открытые порты 80/443.

---

## 🚚 Перенос архива на сервер

1. Скопируйте файл `release/microclimat_analyzer_dist_20251120_1316.zip` на сервер:
   - Linux/macOS: `scp release/microclimat_analyzer_dist_20251120_1316.zip user@server:/var/www/microclimat`.
   - Windows Server: перенесите через RDP/SMB или `pscp.exe`.
2. На сервере создайте директорию деплоя, если ещё нет:
   ```bash
   sudo mkdir -p /var/www/microclimat && sudo chown $USER /var/www/microclimat
   ```
3. Распакуйте архив:
   ```bash
   cd /var/www/microclimat
   unzip microclimat_analyzer_dist_20251120_1316.zip -d current
   ```

---

## 🌐 Настройка веб-сервера (Nginx + статика)

1. Установите Nginx:
   ```bash
   sudo apt update && sudo apt install -y nginx
   ```
2. Создайте конфигурацию `/etc/nginx/sites-available/microclimat`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       root /var/www/microclimat/current;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location ~* \.(js|css|ico|png|jpg|svg|woff2?)$ {
           add_header Cache-Control "public, max-age=31536000, immutable";
       }
   }
   ```
3. Активируйте сайт и перезапустите Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/microclimat /etc/nginx/sites-enabled/microclimat
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Для HTTPS выполните `sudo certbot --nginx -d your-domain.com` (см. `DEPLOYMENT_GUIDE.md` для подробностей).

---

## 🖥 Альтернатива: Windows Server + IIS/static server

1. Установите IIS и добавьте роль Static Content.
2. Создайте сайт, укажите физический путь на распакованную папку (`C:\inetpub\microclimat\current`).
3. Включите переписывание URL (URL Rewrite Module) с правилом:
   ```
   Requested URL: Matches the Pattern
   Using: Regular Expressions
   Pattern: (.*)
   Action type: Rewrite
   Rewrite URL: /index.html
   ```
4. Обновите MIME-типы при необходимости (js/css/svg/woff2).

---

## 🗄️ Настройка базы данных PostgreSQL

1. Установите PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-contrib
   ```

2. Создайте базу данных и пользователя:
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE microclimat;
   CREATE USER microclimat_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE microclimat TO microclimat_user;
   \q
   ```

3. Примените миграции и настройте базу данных (рекомендуется):
   ```bash
   cd /path/to/Microclimat_Analyzer
   npm install
   # Настройте .env с параметрами БД
   npm run setup-db
   ```
   
   Скрипт `setup-db` автоматически:
   - ✅ Применит все миграции базы данных
   - ✅ Добавит 100 логгеров Testo 174T (DL-001 до DL-100)
   - ✅ Добавит 100 логгеров Testo 174H (DL-201 до DL-300)
   - ✅ Пропустит добавление, если логгеры уже существуют
   - ✅ Безопасен для повторного запуска (идемпотентен)
   
   Альтернативно, только миграции (без логгеров):
   ```bash
   npm run migrate
   ```
   
   Или вручную:
   ```bash
   psql -U microclimat_user -d microclimat -f database_setup.sql
   npm run add-loggers  # Добавить логгеры отдельно
   ```

## 🖥️ Настройка бэкенд-сервера

1. Установите Node.js (если еще не установлен):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. Настройте переменные окружения (`.env` в корне проекта):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=microclimat
   DB_USER=microclimat_user
   DB_PASSWORD=your_secure_password
   PORT=3001
   NODE_ENV=production
   ```

3. Запустите бэкенд-сервер:
   ```bash
   cd /path/to/Microclimat_Analyzer
   npm install
   npm run server:prod
   ```

4. Для production используйте PM2:
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "microclimat-api" -- run server:prod
   pm2 save
   pm2 startup
   ```

## ✅ Проверка

1. Откройте `https://your-domain.com` и убедитесь, что приложение загружается.
2. В DevTools проверьте Network → запросы к API (`/api/*`) должны возвращать 200.
3. Проверьте health endpoint: `curl http://localhost:3001/health`

---

## 🔄 Обновление версии

1. Соберите проект заново на локальной машине (`npm run build`).
2. Переупакуйте `dist/` в новый архив в каталоге `release/`.
3. Передайте архив на сервер, распакуйте в новую папку (например, `/var/www/microclimat/releases/2025-11-20`).
4. Переключите симлинк `current` на новую папку и выполните `sudo systemctl reload nginx`.
5. Удалите старые релизы по необходимости.

---

## 🧰 Полезные команды

- Проверка статуса Nginx: `sudo systemctl status nginx`
- Просмотр логов доступа: `sudo tail -f /var/log/nginx/access.log`
- Просмотр ошибок: `sudo tail -f /var/log/nginx/error.log`

## 📝 Примечания

- Приложение использует PostgreSQL напрямую через бэкенд-API
- Фронтенд общается с бэкендом через REST API
- Файлы хранятся локально в папке `uploads/` на сервере
- Для production рекомендуется настроить reverse proxy (Nginx) для бэкенда

Подробное описание базовой инфраструктуры смотрите в `DEPLOYMENT_GUIDE.md`.

