#!/usr/bin/env bash

# ============================================
# Скрипт развертывания Microclimat Analyzer
# на Ubuntu 24 с нуля
# ============================================

set -e  # Остановка при ошибке

# Убеждаемся, что используется bash
if [ -z "$BASH_VERSION" ]; then
    exec bash "$0" "$@"
fi

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Пожалуйста, запустите скрипт с правами root (sudo)"
        exit 1
    fi
}

# Ввод параметров
read_config() {
    print_info "Введите параметры для развертывания:"
    echo ""
    
    read -p "Имя пользователя для проекта (по умолчанию: stas): " PROJECT_USER
    PROJECT_USER=${PROJECT_USER:-stas}
    
    read -p "Директория проекта (по умолчанию: /home/$PROJECT_USER/Microclimat_Analyzer): " PROJECT_DIR
    PROJECT_DIR=${PROJECT_DIR:-/home/$PROJECT_USER/Microclimat_Analyzer}
    
    read -p "URL репозитория GitHub (по умолчанию: https://github.com/Dylkin/Microclimat_Analyzer.git): " GIT_REPO
    GIT_REPO=${GIT_REPO:-https://github.com/Dylkin/Microclimat_Analyzer.git}
    
    read -p "Ветка для развертывания (по умолчанию: main): " GIT_BRANCH
    GIT_BRANCH=${GIT_BRANCH:-main}
    
    read -p "Доменное имя (например, sensors.good-soft.com): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
        print_error "Доменное имя обязательно!"
        exit 1
    fi
    
    read -p "Имя базы данных (по умолчанию: microclimat): " DB_NAME
    DB_NAME=${DB_NAME:-microclimat}
    
    read -p "Пользователь базы данных (по умолчанию: microclimat_user): " DB_USER
    DB_USER=${DB_USER:-microclimat_user}
    
    echo -n "Пароль базы данных: "
    read -s DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Пароль базы данных обязателен!"
        exit 1
    fi
    
    read -p "Порт бэкенда (по умолчанию: 3001): " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-3001}
    
    print_success "Параметры сохранены"
}

# Обновление системы
update_system() {
    print_info "Обновление системы..."
    apt-get update
    apt-get upgrade -y
    apt-get install -y git build-essential
    print_success "Система обновлена"
}

# Установка Node.js
install_nodejs() {
    print_info "Установка Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js уже установлен: $NODE_VERSION"
        read -p "Переустановить? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Установка зависимостей
    apt-get install -y curl ca-certificates gnupg
    
    # Установка Node.js 20.x LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # Проверка установки
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js установлен: $NODE_VERSION"
    print_success "npm установлен: $NPM_VERSION"
}

# Установка PostgreSQL
install_postgresql() {
    print_info "Установка PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        print_warning "PostgreSQL уже установлен"
        read -p "Переустановить? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    apt-get install -y postgresql postgresql-contrib
    
    # Запуск PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    print_success "PostgreSQL установлен и запущен"
}

# Настройка базы данных
setup_database() {
    print_info "Настройка базы данных..."
    
    # Проверка существования пользователя
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")
    if [ "$USER_EXISTS" = "1" ]; then
        print_warning "Пользователь $DB_USER уже существует"
        read -p "Пересоздать пользователя и базу данных? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF
        else
            # Обновляем пароль существующего пользователя
            sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
            print_success "Пароль пользователя обновлен"
            return
        fi
    fi
    
    # Создание пользователя и базы данных
    sudo -u postgres psql <<EOF
-- Создание пользователя с правами для создания схем и выполнения миграций
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB CREATEROLE;

-- Создание базы данных
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Предоставление всех прав на базу данных
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Выход
\q
EOF
    
    # Предоставление прав на схему public
    sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Предоставление всех прав на схему public
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Выход
\q
EOF
    
    print_success "База данных создана: $DB_NAME"
    print_success "Пользователь создан: $DB_USER"
    print_success "Права для миграций предоставлены"
}

# Установка Nginx
install_nginx() {
    print_info "Установка Nginx..."
    
    apt-get install -y nginx
    
    systemctl start nginx
    systemctl enable nginx
    
    print_success "Nginx установлен и запущен"
}

# Установка PM2
install_pm2() {
    print_info "Установка PM2..."
    
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        print_warning "PM2 уже установлен: v$PM2_VERSION"
        return
    fi
    
    npm install -g pm2
    
    # Проверка установки
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 установлен: v$PM2_VERSION"
}

# Создание пользователя (если не существует)
create_user() {
    if id "$PROJECT_USER" &>/dev/null; then
        print_warning "Пользователь $PROJECT_USER уже существует"
    else
        print_info "Создание пользователя $PROJECT_USER..."
        useradd -m -s /bin/bash "$PROJECT_USER"
        print_success "Пользователь $PROJECT_USER создан"
    fi
}

# Клонирование репозитория
clone_repository() {
    print_info "Клонирование репозитория..."
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Директория $PROJECT_DIR уже существует"
        read -p "Удалить и пересоздать? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_DIR"
        else
            print_info "Обновление существующего репозитория..."
            cd "$PROJECT_DIR"
            git pull origin "$GIT_BRANCH"
            return
        fi
    fi
    
    # Создание директории
    mkdir -p "$(dirname "$PROJECT_DIR")"
    
    # Клонирование
    git clone -b "$GIT_BRANCH" "$GIT_REPO" "$PROJECT_DIR"
    
    # Установка прав
    chown -R "$PROJECT_USER:$PROJECT_USER" "$PROJECT_DIR"
    
    print_success "Репозиторий склонирован"
}

# Создание файла .env
create_env_file() {
    print_info "Создание файла .env..."
    
    ENV_FILE="$PROJECT_DIR/.env"
    
    if [ -f "$ENV_FILE" ]; then
        print_warning "Файл .env уже существует"
        read -p "Пересоздать? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    cat > "$ENV_FILE" <<EOF
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Сервер
PORT=$BACKEND_PORT
NODE_ENV=production

# CORS
CORS_ORIGIN=https://$DOMAIN_NAME
EOF
    
    chown "$PROJECT_USER:$PROJECT_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    
    print_success "Файл .env создан"
}

# Установка зависимостей
install_dependencies() {
    print_info "Установка зависимостей проекта..."
    
    cd "$PROJECT_DIR"
    sudo -u "$PROJECT_USER" npm install
    
    print_success "Зависимости установлены"
}

# Настройка базы данных (миграции)
setup_database_schema() {
    print_info "Настройка схемы базы данных..."
    
    cd "$PROJECT_DIR"
    sudo -u "$PROJECT_USER" npm run setup-db
    
    print_success "Схема базы данных настроена"
}

# Создание пользователя по умолчанию
create_default_user() {
    print_info "Создание пользователя по умолчанию..."
    
    cd "$PROJECT_DIR"
    
    # Проверяем, существует ли скрипт
    if [ -f "server/scripts/create-default-user.ts" ]; then
        sudo -u "$PROJECT_USER" npm run create-default-user
        
        if [ $? -eq 0 ]; then
            print_success "Пользователь по умолчанию создан"
        else
            print_warning "Ошибка при создании пользователя по умолчанию (возможно, уже существует)"
        fi
    else
        print_warning "Скрипт создания пользователя по умолчанию не найден"
    fi
}

# Сборка проекта
build_project() {
    print_info "Сборка проекта..."
    
    cd "$PROJECT_DIR"
    sudo -u "$PROJECT_USER" npm run build
    
    if [ -d "$PROJECT_DIR/dist" ]; then
        BUILD_SIZE=$(du -sh "$PROJECT_DIR/dist" | cut -f1)
        print_success "Проект собран (размер: $BUILD_SIZE)"
    else
        print_error "Ошибка при сборке проекта"
        exit 1
    fi
}

# Настройка Nginx
setup_nginx() {
    print_info "Настройка Nginx..."
    
    NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
    NGINX_ENABLED="/etc/nginx/sites-enabled/microclimat-analyzer"
    
    # Создание конфигурации
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Лимит размера загружаемых файлов (для больших XLS файлов)
    client_max_body_size 200M;

    # Корневая директория для статических файлов
    root $PROJECT_DIR/dist;
    index index.html;

    # Логи
    access_log /var/log/nginx/microclimat-access.log;
    error_log /var/log/nginx/microclimat-error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Статические файлы
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Кэширование статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Проксирование API запросов
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # ВАЖНО: Передача заголовков для авторизации
        # Включаем передачу всех заголовков от клиента
        proxy_pass_request_headers on;
        
        # Передаем заголовок x-user-id в разных форматах
        # В Nginx заголовки преобразуются: x-user-id → \$http_x_user_id
        proxy_set_header X-User-Id \$http_x_user_id;
        proxy_set_header x-user-id \$http_x_user_id;
        proxy_set_header x-userid \$http_x_userid;
        
        proxy_cache_bypass \$http_upgrade;
    }

    # Проксирование загрузок
    location /uploads {
        alias $PROJECT_DIR/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    
    # Создание символической ссылки
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    
    # Удаление дефолтной конфигурации
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверка конфигурации
    nginx -t
    
    # Перезагрузка Nginx
    systemctl reload nginx
    
    print_success "Nginx настроен"
}

# Настройка PM2
setup_pm2() {
    print_info "Настройка PM2..."
    
    cd "$PROJECT_DIR"
    
    # Обновление ecosystem.config.cjs с правильными путями
    if [ -f "ecosystem.config.cjs" ]; then
        sed -i "s|/home/stas/Microclimat_Analyzer|$PROJECT_DIR|g" ecosystem.config.cjs
        sed -i "s|/home/stas|/home/$PROJECT_USER|g" ecosystem.config.cjs
    fi
    
    # Создание директории для логов PM2
    mkdir -p "/home/$PROJECT_USER/.pm2/logs"
    chown -R "$PROJECT_USER:$PROJECT_USER" "/home/$PROJECT_USER/.pm2"
    
    # Запуск приложения через PM2
    sudo -u "$PROJECT_USER" pm2 start ecosystem.config.cjs
    
    # Сохранение конфигурации PM2
    sudo -u "$PROJECT_USER" pm2 save
    
    # Настройка автозапуска PM2
    sudo -u "$PROJECT_USER" pm2 startup systemd -u "$PROJECT_USER" --hp "/home/$PROJECT_USER" | bash
    
    print_success "PM2 настроен"
}

# Создание директории для загрузок
create_uploads_dir() {
    print_info "Создание директории для загрузок..."
    
    UPLOADS_DIR="$PROJECT_DIR/uploads"
    mkdir -p "$UPLOADS_DIR"
    chown -R "$PROJECT_USER:$PROJECT_USER" "$UPLOADS_DIR"
    chmod 755 "$UPLOADS_DIR"
    
    print_success "Директория для загрузок создана: $UPLOADS_DIR"
}

# Проверка развертывания
verify_deployment() {
    print_info "Проверка развертывания..."
    
    # Проверка Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx работает"
    else
        print_error "Nginx не работает"
    fi
    
    # Проверка PM2
    cd "$PROJECT_DIR"
    PM2_STATUS=$(sudo -u "$PROJECT_USER" pm2 list | grep microclimat-api | awk '{print $10}')
    if [ "$PM2_STATUS" = "online" ]; then
        print_success "PM2 процесс работает"
    else
        print_error "PM2 процесс не работает"
    fi
    
    # Проверка API
    sleep 2
    if curl -f -s "http://localhost:$BACKEND_PORT/health" > /dev/null; then
        print_success "API доступен"
    else
        print_warning "API недоступен (возможно, еще запускается)"
    fi
    
    # Проверка базы данных
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_success "База данных существует"
    else
        print_error "База данных не найдена"
    fi
}

# Главная функция
main() {
    echo ""
    echo "============================================"
    echo "  Развертывание Microclimat Analyzer"
    echo "  Ubuntu 24 Production Setup"
    echo "============================================"
    echo ""
    
    check_root
    read_config
    
    echo ""
    print_info "Начинаем развертывание..."
    echo ""
    
    update_system
    install_nodejs
    install_postgresql
    setup_database
    install_nginx
    install_pm2
    create_user
    clone_repository
    create_env_file
    install_dependencies
    setup_database_schema
    create_default_user
    build_project
    create_uploads_dir
    setup_nginx
    setup_pm2
    verify_deployment
    
    echo ""
    echo "============================================"
    print_success "Развертывание завершено!"
    echo "============================================"
    echo ""
    print_info "Приложение доступно по адресу: http://$DOMAIN_NAME"
    print_info "API доступен по адресу: http://$DOMAIN_NAME/api"
    print_info "Health check: http://$DOMAIN_NAME/api/health"
    echo ""
    print_info "Полезные команды:"
    echo "  - Просмотр логов PM2: sudo -u $PROJECT_USER pm2 logs"
    echo "  - Статус PM2: sudo -u $PROJECT_USER pm2 status"
    echo "  - Перезапуск PM2: sudo -u $PROJECT_USER pm2 restart all"
    echo "  - Логи Nginx: tail -f /var/log/nginx/microclimat-error.log"
    echo "  - Перезапуск Nginx: systemctl reload nginx"
    echo ""
}

# Запуск
main

