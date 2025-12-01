#!/usr/bin/env bash

# ============================================
# Скрипт для увеличения лимита загрузки файлов
# в конфигурации Nginx
# ============================================

set -e # Остановка при ошибке

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
    echo -e "${GREEN[SUCCESS]${NC} $1"
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

# Проверка, что используется bash
check_bash() {
    if [ -z "$BASH_VERSION" ]; then
        print_error "Этот скрипт должен быть запущен с помощью bash. Пожалуйста, используйте: sudo bash $0"
        exit 1
    fi
}

# Главная функция
main() {
    echo ""
    echo "============================================"
    echo "  Увеличение лимита загрузки файлов Nginx"
    echo "  для Microclimat Analyzer"
    echo "============================================"
    echo ""
    
    check_root
    check_bash
    
    print_info "Начинаем обновление Nginx..."
    
    NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
    
    if [ ! -f "$NGINX_CONF" ]; then
        print_error "Конфигурационный файл Nginx не найден: $NGINX_CONF"
        print_error "Убедитесь, что Nginx установлен и настроен для Microclimat Analyzer."
        exit 1
    fi

    print_info "Резервное копирование существующей конфигурации: ${NGINX_CONF}.bak"
    cp "$NGINX_CONF" "${NGINX_CONF}.bak"

    # Проверяем, есть ли уже client_max_body_size
    if grep -q "client_max_body_size" "$NGINX_CONF"; then
        print_warning "client_max_body_size уже присутствует в конфигурации. Обновляем значение..."
        # Обновляем существующее значение
        sed -i 's/client_max_body_size.*/client_max_body_size 200M;/' "$NGINX_CONF"
    else
        print_info "Добавление client_max_body_size 200M в конфигурацию Nginx..."
        # Добавляем после server_name
        sed -i '/server_name/a\    client_max_body_size 200M;' "$NGINX_CONF"
    fi

    print_success "Лимит загрузки файлов обновлен до 200MB."

    print_info "Проверка синтаксиса Nginx..."
    if nginx -t; then
        print_success "Синтаксис Nginx корректен."
    else
        print_error "Ошибка в синтаксисе Nginx. Восстанавливаем резервную копию..."
        cp "${NGINX_CONF}.bak" "$NGINX_CONF"
        exit 1
    fi

    print_info "Перезагрузка Nginx..."
    systemctl reload nginx

    print_success "Nginx перезагружен. Теперь поддерживается загрузка файлов до 200MB."
    echo ""
    print_info "Также убедитесь, что лимит в multer (server/routes/storage.ts) установлен на 200MB или больше."
    echo ""
}

# Запуск главной функции
main

