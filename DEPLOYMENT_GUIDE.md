# 🚀 Руководство по развертыванию проекта Microclimat Analyzer

## 📋 Содержание
1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка зависимостей](#установка-зависимостей)
4. [Настройка базы данных Supabase](#настройка-базы-данных-supabase)
5. [Клонирование и настройка проекта](#клонирование-и-настройка-проекта)
6. [Сборка проекта](#сборка-проекта)
7. [Настройка веб-сервера](#настройка-веб-сервера)
8. [SSL сертификат](#ssl-сертификат)
9. [Запуск и мониторинг](#запуск-и-мониторинг)
10. [Резервное копирование](#резервное-копирование)

---

## 📌 Требования к серверу

### Минимальные требования:
- **ОС:** Ubuntu 20.04 LTS / 22.04 LTS или Windows Server 2019/2022
- **CPU:** 2 ядра
- **RAM:** 4 GB
- **Диск:** 20 GB свободного места
- **Сеть:** Статический IP-адрес, порты 80, 443 открыты

### Рекомендуемые требования:
- **ОС:** Ubuntu 22.04 LTS
- **CPU:** 4 ядра
- **RAM:** 8 GB
- **Диск:** 50 GB SSD
- **Сеть:** Статический IP, CDN (опционально)

---

## 🔧 Подготовка сервера

### Для Ubuntu/Debian:

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y curl wget git build-essential
```

### Для Windows Server:

1. Установите [Git для Windows](https://git-scm.com/download/win)
2. Установите [Node.js LTS](https://nodejs.org/)
3. Откройте PowerShell от имени администратора

---

## 📦 Установка зависимостей

### 1. Установка Node.js (для Ubuntu)

```bash
# Установка Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка установки
node --version  # должно быть v20.x.x
npm --version   # должно быть 10.x.x
```

### 2. Установка PM2 (Process Manager)

```bash
# Установка PM2 глобально
sudo npm install -g pm2

# Проверка установки
pm2 --version
```

---

## 🗄️ Настройка базы данных Supabase

### 1. Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте аккаунт или войдите
3. Нажмите "New Project"
4. Заполните данные:
   - **Name:** microclimat-analyzer
   - **Database Password:** (надежный пароль)
   - **Region:** выберите ближайший регион
5. Дождитесь создания проекта (~2 минуты)

### 2. Получение учетных данных

В панели Supabase:
1. Перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **anon public** ключ
   - **service_role** ключ (для административных операций)

### 3. Создание структуры базы данных

Выполните SQL-скрипты из папки проекта в следующем порядке:

#### a) Основные таблицы:

```sql
-- В Supabase Dashboard → SQL Editor

-- 1. Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица проектов
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  contract_number TEXT,
  contract_date DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица объектов квалификации
CREATE TABLE IF NOT EXISTS public.qualification_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL,
  climate_system TEXT,
  temperature_limits JSONB,
  humidity_limits JSONB,
  measurement_zones INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица оборудования
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  calibration_date DATE,
  next_calibration_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Таблица периодов испытаний
CREATE TABLE IF NOT EXISTS public.testing_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Таблица данных логгеров
CREATE TABLE IF NOT EXISTS public.logger_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  testing_period_id UUID REFERENCES public.testing_periods(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id),
  measurement_zone INTEGER,
  measurement_level NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Таблица отчетов
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT DEFAULT 'trial',
  report_data JSONB,
  report_url TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Таблица аудита
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Таблица документов проекта
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### b) Создание индексов для оптимизации:

```sql
-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_qualification_objects_project ON public.qualification_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_testing_periods_project ON public.testing_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_logger_data_project ON public.logger_data(project_id);
CREATE INDEX IF NOT EXISTS idx_logger_data_timestamp ON public.logger_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project ON public.analysis_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
```

#### c) Настройка Row Level Security (RLS):

```sql
-- Включение RLS для таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logger_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Политики доступа (пример для authenticated пользователей)
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert projects" ON public.projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update projects" ON public.projects
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Аналогично создайте политики для остальных таблиц
```

### 4. Настройка Storage (хранилище файлов)

```sql
-- Создание bucket для файлов
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- Политика доступа к файлам
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');
```

---

## 📁 Клонирование и настройка проекта

### 1. Клонирование репозитория

```bash
# Переход в директорию для проектов
cd /var/www  # для Linux
# или
cd C:\inetpub\wwwroot  # для Windows

# Клонирование проекта
git clone https://github.com/Dylkin/Microclimat_Analyzer.git
cd Microclimat_Analyzer

# Переключение на нужную ветку
git checkout podgotovkaprotokola-ok
```

### 2. Создание файла переменных окружения

```bash
# Создание файла .env
nano .env  # для Linux
# или
notepad .env  # для Windows
```

Содержимое файла `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
VITE_APP_NAME=Microclimat Analyzer
VITE_APP_VERSION=1.0.0

# Environment
NODE_ENV=production
```

⚠️ **ВАЖНО:** Замените значения на реальные из вашего проекта Supabase!

### 3. Установка зависимостей проекта

```bash
# Установка всех зависимостей
npm install

# Если возникают ошибки, попробуйте:
npm install --legacy-peer-deps
```

---

## 🏗️ Сборка проекта

### 1. Сборка production версии

```bash
# Сборка оптимизированной версии
npm run build

# Результат будет в папке dist/
```

### 2. Проверка сборки локально

```bash
# Предварительный просмотр production сборки
npm run preview
```

Откройте браузер и перейдите по адресу, указанному в консоли (обычно `http://localhost:4173`)

---

## 🌐 Настройка веб-сервера

### Вариант 1: Nginx (рекомендуется для Linux)

#### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

#### 2. Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/microclimat-analyzer
```

Содержимое файла:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/Microclimat_Analyzer/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (если требуется)
    location /api {
        proxy_pass https://your-project-id.supabase.co;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/microclimat-analyzer /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx

# Автозапуск при загрузке системы
sudo systemctl enable nginx
```

### Вариант 2: Apache (альтернатива)

#### 1. Установка Apache

```bash
sudo apt install -y apache2
```

#### 2. Создание конфигурации

```bash
sudo nano /etc/apache2/sites-available/microclimat-analyzer.conf
```

Содержимое:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    DocumentRoot /var/www/Microclimat_Analyzer/dist
    
    <Directory /var/www/Microclimat_Analyzer/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/microclimat-error.log
    CustomLog ${APACHE_LOG_DIR}/microclimat-access.log combined
</VirtualHost>
```

#### 3. Активация

```bash
# Включение модулей
sudo a2enmod rewrite
sudo a2enmod headers

# Активация сайта
sudo a2ensite microclimat-analyzer.conf

# Перезапуск Apache
sudo systemctl restart apache2

# Автозапуск
sudo systemctl enable apache2
```

### Вариант 3: IIS (для Windows Server)

#### 1. Установка IIS

```powershell
# Запуск PowerShell от администратора
Install-WindowsFeature -name Web-Server -IncludeManagementTools
```

#### 2. Настройка сайта

1. Откройте **IIS Manager**
2. Правый клик на **Sites** → **Add Website**
3. Заполните:
   - **Site name:** MicroclimatAnalyzer
   - **Physical path:** `C:\inetpub\wwwroot\Microclimat_Analyzer\dist`
   - **Binding:** HTTP, Port 80, hostname: your-domain.com
4. Создайте файл `web.config` в папке `dist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## 🔒 SSL сертификат

### Использование Let's Encrypt (бесплатно)

#### Для Nginx:

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автопродление (добавляется автоматически в cron)
sudo certbot renew --dry-run
```

#### Для Apache:

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-apache

# Получение сертификата
sudo certbot --apache -d your-domain.com -d www.your-domain.com
```

---

## 🚀 Запуск и мониторинг

### Настройка автоматического развертывания

#### 1. Создание скрипта развертывания

```bash
nano /var/www/deploy.sh
```

Содержимое:

```bash
#!/bin/bash

# Переход в директорию проекта
cd /var/www/Microclimat_Analyzer

# Получение последних изменений
git pull origin podgotovkaprotokola-ok

# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Перезапуск веб-сервера
sudo systemctl restart nginx

echo "Deployment completed successfully!"
```

#### 2. Настройка прав

```bash
chmod +x /var/www/deploy.sh
```

### Мониторинг логов

#### Nginx:

```bash
# Просмотр логов ошибок
sudo tail -f /var/log/nginx/error.log

# Просмотр логов доступа
sudo tail -f /var/log/nginx/access.log
```

#### Apache:

```bash
# Логи ошибок
sudo tail -f /var/log/apache2/microclimat-error.log

# Логи доступа
sudo tail -f /var/log/apache2/microclimat-access.log
```

### Мониторинг системы

```bash
# Использование ресурсов
htop

# Дисковое пространство
df -h

# Статус служб
sudo systemctl status nginx
```

---

## 💾 Резервное копирование

### 1. Создание скрипта резервного копирования

```bash
sudo nano /usr/local/bin/backup-microclimat.sh
```

Содержимое:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/microclimat"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/var/www/Microclimat_Analyzer"

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Бэкап файлов проекта
tar -czf $BACKUP_DIR/project_$DATE.tar.gz $PROJECT_DIR

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "project_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/project_$DATE.tar.gz"
```

### 2. Настройка автоматического бэкапа

```bash
# Права на выполнение
sudo chmod +x /usr/local/bin/backup-microclimat.sh

# Добавление в crontab (ежедневно в 2:00)
sudo crontab -e

# Добавьте строку:
0 2 * * * /usr/local/bin/backup-microclimat.sh >> /var/log/backup-microclimat.log 2>&1
```

### 3. Бэкап базы данных Supabase

Supabase автоматически создает резервные копии, но вы можете экспортировать данные:

1. В Supabase Dashboard → **Database** → **Backups**
2. Нажмите **Download** для ручного скачивания
3. Или используйте API для автоматизации:

```bash
# Установка Supabase CLI
npm install -g supabase

# Экспорт схемы БД
supabase db dump --db-url "postgresql://..." > backup.sql
```

---

## 🔍 Проверка работоспособности

### 1. Проверка доступности сайта

```bash
curl -I http://your-domain.com
```

Ожидаемый результат: `HTTP/1.1 200 OK`

### 2. Проверка SSL

```bash
curl -I https://your-domain.com
```

### 3. Тестирование производительности

```bash
# Установка Apache Bench
sudo apt install -y apache2-utils

# Нагрузочный тест
ab -n 1000 -c 10 http://your-domain.com/
```

---

## 📊 Мониторинг производительности

### Установка и настройка Grafana + Prometheus (опционально)

```bash
# Установка node_exporter для мониторинга системы
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Создание systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

Содержимое:

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Запуск
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

---

## 🆘 Решение проблем

### Проблема: Сайт не открывается

```bash
# Проверка статуса Nginx
sudo systemctl status nginx

# Проверка конфигурации
sudo nginx -t

# Просмотр логов
sudo tail -f /var/log/nginx/error.log
```

### Проблема: Ошибка 502 Bad Gateway

- Проверьте, запущено ли приложение
- Проверьте настройки proxy_pass в Nginx
- Проверьте файрволл

### Проблема: Нет подключения к Supabase

- Проверьте переменные окружения в `.env`
- Проверьте настройки RLS в Supabase
- Проверьте сетевое подключение

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Проверьте логи браузера (F12 → Console)
3. Обратитесь к документации Supabase
4. Создайте Issue в GitHub репозитории

---

## ✅ Чеклист развертывания

- [ ] Сервер настроен и обновлен
- [ ] Node.js установлен (v20.x)
- [ ] Проект Supabase создан
- [ ] База данных настроена (таблицы, индексы, RLS)
- [ ] Storage bucket создан
- [ ] Репозиторий склонирован
- [ ] Файл `.env` создан с правильными данными
- [ ] Зависимости установлены (`npm install`)
- [ ] Проект собран (`npm run build`)
- [ ] Веб-сервер настроен (Nginx/Apache/IIS)
- [ ] SSL сертификат установлен
- [ ] Файрволл настроен
- [ ] Резервное копирование настроено
- [ ] Мониторинг настроен
- [ ] Сайт доступен и работает

---

## 🎉 Поздравляем!

Проект успешно развернут и готов к использованию!

**Дата создания:** 21.10.2025  
**Версия:** 1.0.0  
**Автор:** Microclimat Analyzer Team


