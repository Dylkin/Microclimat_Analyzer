#!/bin/bash

# ================================
# Microclimat Analyzer Deployment Script
# ================================

set -e  # Выход при ошибке

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

# Проверка root прав
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Этот скрипт должен быть запущен с правами root (используйте sudo)"
        exit 1
    fi
}

# Проверка ОС
check_os() {
    print_info "Проверка операционной системы..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        print_success "Обнаружена ОС: $OS $VERSION"
    else
        print_error "Не удалось определить операционную систему"
        exit 1
    fi
}

# Установка зависимостей
install_dependencies() {
    print_info "Установка зависимостей..."
    
    case $OS in
        ubuntu|debian)
            apt update
            apt install -y curl wget git nginx certbot python3-certbot-nginx
            ;;
        centos|rhel)
            yum update -y
            yum install -y curl wget git nginx certbot python3-certbot-nginx
            ;;
        *)
            print_error "Неподдерживаемая ОС: $OS"
            exit 1
            ;;
    esac
    
    print_success "Зависимости установлены"
}

# Установка Node.js
install_nodejs() {
    print_info "Проверка Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_warning "Node.js уже установлен: $NODE_VERSION"
        read -p "Хотите обновить Node.js? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    print_info "Установка Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    print_success "Node.js установлен: $NODE_VERSION"
    print_success "npm установлен: $NPM_VERSION"
}

# Клонирование проекта
clone_project() {
    print_info "Настройка проекта..."
    
    PROJECT_DIR="/var/www/Microclimat_Analyzer"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Директория проекта уже существует: $PROJECT_DIR"
        read -p "Хотите удалить и склонировать заново? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_DIR"
        else
            print_info "Обновление существующего проекта..."
            cd "$PROJECT_DIR"
            git pull origin podgotovkaprotokola-ok
            return
        fi
    fi
    
    print_info "Клонирование репозитория..."
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/Dylkin/Microclimat_Analyzer.git
    cd Microclimat_Analyzer
    git checkout podgotovkaprotokola-ok
    
    print_success "Проект склонирован в $PROJECT_DIR"
}

# Настройка окружения
setup_environment() {
    print_info "Настройка переменных окружения..."
    
    PROJECT_DIR="/var/www/Microclimat_Analyzer"
    ENV_FILE="$PROJECT_DIR/.env"
    
    if [ -f "$ENV_FILE" ]; then
        print_warning "Файл .env уже существует"
        read -p "Хотите пересоздать его? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    echo ""
    print_info "Введите параметры Supabase:"
    read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    
    cat > "$ENV_FILE" << EOF
# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Application Configuration
VITE_APP_NAME=Microclimat Analyzer
VITE_APP_VERSION=1.0.0

# Environment
NODE_ENV=production
EOF
    
    print_success "Файл .env создан"
}

# Сборка проекта
build_project() {
    print_info "Установка зависимостей проекта..."
    
    PROJECT_DIR="/var/www/Microclimat_Analyzer"
    cd "$PROJECT_DIR"
    
    npm install
    
    print_info "Сборка проекта..."
    npm run build
    
    if [ -d "$PROJECT_DIR/dist" ]; then
        print_success "Проект успешно собран"
        print_info "Размер сборки: $(du -sh dist | cut -f1)"
    else
        print_error "Ошибка при сборке проекта"
        exit 1
    fi
}

# Настройка Nginx
setup_nginx() {
    print_info "Настройка Nginx..."
    
    read -p "Введите доменное имя (например, example.com): " DOMAIN_NAME
    
    NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
    
    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

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

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    access_log /var/log/nginx/microclimat-access.log;
    error_log /var/log/nginx/microclimat-error.log;
}
EOF
    
    # Активация конфигурации
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    
    # Удаление дефолтного сайта
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверка конфигурации
    if nginx -t; then
        print_success "Конфигурация Nginx корректна"
        systemctl restart nginx
        systemctl enable nginx
        print_success "Nginx перезапущен и добавлен в автозагрузку"
    else
        print_error "Ошибка в конфигурации Nginx"
        exit 1
    fi
}

# Установка SSL
setup_ssl() {
    print_info "Настройка SSL сертификата..."
    
    read -p "Хотите установить SSL сертификат от Let's Encrypt? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "SSL не установлен. Вы можете установить его позже командой:"
        print_info "sudo certbot --nginx -d $DOMAIN_NAME"
        return
    fi
    
    read -p "Введите email для уведомлений от Let's Encrypt: " EMAIL
    
    certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" \
        --non-interactive --agree-tos --email "$EMAIL" --redirect
    
    if [ $? -eq 0 ]; then
        print_success "SSL сертификат установлен"
        print_info "Автопродление настроено через cron"
    else
        print_error "Ошибка при установке SSL"
    fi
}

# Настройка файрволла
setup_firewall() {
    print_info "Настройка файрволла..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 'Nginx Full'
        ufw allow OpenSSH
        print_success "Файрволл настроен (UFW)"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        print_success "Файрволл настроен (firewalld)"
    else
        print_warning "Файрволл не обнаружен. Убедитесь, что порты 80 и 443 открыты"
    fi
}

# Создание скрипта обновления
create_update_script() {
    print_info "Создание скрипта обновления..."
    
    UPDATE_SCRIPT="/usr/local/bin/update-microclimat.sh"
    
    cat > "$UPDATE_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "🔄 Обновление Microclimat Analyzer..."

cd /var/www/Microclimat_Analyzer

# Получение последних изменений
echo "📥 Получение изменений из Git..."
git pull origin podgotovkaprotokola-ok

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# Сборка проекта
echo "🏗️  Сборка проекта..."
npm run build

# Перезапуск Nginx
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

echo "✅ Обновление завершено!"
echo "🌐 Сайт доступен по адресу: $(grep server_name /etc/nginx/sites-available/microclimat-analyzer | head -n1 | awk '{print $2}' | sed 's/;//')"
EOF
    
    chmod +x "$UPDATE_SCRIPT"
    print_success "Скрипт обновления создан: $UPDATE_SCRIPT"
}

# Создание скрипта резервного копирования
create_backup_script() {
    print_info "Создание скрипта резервного копирования..."
    
    BACKUP_SCRIPT="/usr/local/bin/backup-microclimat.sh"
    
    cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/microclimat"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/var/www/Microclimat_Analyzer"

mkdir -p $BACKUP_DIR

echo "💾 Создание резервной копии..."
tar -czf $BACKUP_DIR/project_$DATE.tar.gz $PROJECT_DIR

# Удаление старых бэкапов (>30 дней)
find $BACKUP_DIR -name "project_*.tar.gz" -mtime +30 -delete

echo "✅ Резервная копия создана: $BACKUP_DIR/project_$DATE.tar.gz"
EOF
    
    chmod +x "$BACKUP_SCRIPT"
    
    # Добавление в crontab
    CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> /var/log/backup-microclimat.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -
    
    print_success "Скрипт резервного копирования создан: $BACKUP_SCRIPT"
    print_info "Автоматическое резервное копирование настроено (ежедневно в 2:00)"
}

# Проверка развертывания
verify_deployment() {
    print_info "Проверка развертывания..."
    
    # Проверка Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx запущен"
    else
        print_error "Nginx не запущен"
        exit 1
    fi
    
    # Проверка сборки
    if [ -f "/var/www/Microclimat_Analyzer/dist/index.html" ]; then
        print_success "Файлы проекта найдены"
    else
        print_error "Файлы проекта не найдены"
        exit 1
    fi
    
    # Проверка HTTP
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
    if [ "$HTTP_CODE" == "200" ]; then
        print_success "HTTP сервер отвечает корректно (код: $HTTP_CODE)"
    else
        print_warning "HTTP сервер вернул код: $HTTP_CODE"
    fi
}

# Вывод информации о завершении
print_completion_info() {
    echo ""
    echo "======================================"
    print_success "🎉 Развертывание завершено!"
    echo "======================================"
    echo ""
    print_info "📍 Расположение проекта: /var/www/Microclimat_Analyzer"
    print_info "🌐 Доменное имя: $DOMAIN_NAME"
    print_info "📁 Директория сборки: /var/www/Microclimat_Analyzer/dist"
    echo ""
    print_info "⚙️  Полезные команды:"
    echo "  • Обновление проекта: sudo update-microclimat.sh"
    echo "  • Резервное копирование: sudo backup-microclimat.sh"
    echo "  • Перезапуск Nginx: sudo systemctl restart nginx"
    echo "  • Логи Nginx: sudo tail -f /var/log/nginx/microclimat-error.log"
    echo ""
    print_info "📚 Документация: см. DEPLOYMENT_GUIDE.md"
    echo ""
}

# Главная функция
main() {
    echo "======================================"
    echo "  Microclimat Analyzer Deployment"
    echo "======================================"
    echo ""
    
    check_root
    check_os
    install_dependencies
    install_nodejs
    clone_project
    setup_environment
    build_project
    setup_nginx
    setup_ssl
    setup_firewall
    create_update_script
    create_backup_script
    verify_deployment
    print_completion_info
}

# Запуск
main

