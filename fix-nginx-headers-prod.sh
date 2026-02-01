#!/bin/bash

# ============================================
# Скрипт исправления передачи заголовков x-user-id
# через Nginx на продакшене
# ============================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
if [ "$EUID" -ne 0 ]; then 
    print_error "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

# Поиск конфигурационного файла Nginx
NGINX_CONF=""
if [ -f "/etc/nginx/sites-available/microclimat-analyzer" ]; then
    NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
elif [ -f "/etc/nginx/sites-available/microclimat" ]; then
    NGINX_CONF="/etc/nginx/sites-available/microclimat"
else
    print_error "Конфигурационный файл Nginx не найден!"
    print_info "Доступные файлы:"
    ls -la /etc/nginx/sites-available/ 2>/dev/null || echo "Директория не найдена"
    exit 1
fi

print_info "Найден конфигурационный файл: $NGINX_CONF"

# Проверка, есть ли уже правильная конфигурация
if grep -q "proxy_set_header.*x-user-id\|proxy_set_header.*X-User-Id" "$NGINX_CONF"; then
    print_warning "Заголовок x-user-id уже настроен в конфигурации"
    read -p "Перезаписать? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Отменено"
        exit 0
    fi
fi

# Создание резервной копии
BACKUP_FILE="${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONF" "$BACKUP_FILE"
print_success "Создана резервная копия: $BACKUP_FILE"

# Временный файл
TEMP_FILE=$(mktemp)

# Обработка файла
IN_API_BLOCK=0
HEADER_ADDED=0

while IFS= read -r line || [ -n "$line" ]; do
    # Проверяем начало блока location /api
    if [[ "$line" =~ location\ /api ]]; then
        IN_API_BLOCK=1
        echo "$line" >> "$TEMP_FILE"
    # Проверяем конец блока location /api
    elif [[ "$line" =~ ^[[:space:]]*\} ]] && [ $IN_API_BLOCK -eq 1 ]; then
        # Если мы в блоке /api и еще не добавили заголовок, добавляем его перед закрывающей скобкой
        if [ $HEADER_ADDED -eq 0 ]; then
            echo "        # Передача заголовка x-user-id для аутентификации" >> "$TEMP_FILE"
            echo "        proxy_pass_request_headers on;" >> "$TEMP_FILE"
            echo "        proxy_set_header X-User-Id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "        proxy_set_header x-user-id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "        proxy_set_header x-userid \$http_x_userid;" >> "$TEMP_FILE"
            HEADER_ADDED=1
        fi
        IN_API_BLOCK=0
        echo "$line" >> "$TEMP_FILE"
    # Если мы в блоке /api и встречаем proxy_set_header X-Forwarded-Proto, добавляем после него
    elif [ $IN_API_BLOCK -eq 1 ] && [[ "$line" =~ proxy_set_header.*X-Forwarded-Proto ]]; then
        echo "$line" >> "$TEMP_FILE"
        if [ $HEADER_ADDED -eq 0 ]; then
            echo "        # Передача заголовка x-user-id для аутентификации" >> "$TEMP_FILE"
            echo "        proxy_pass_request_headers on;" >> "$TEMP_FILE"
            echo "        proxy_set_header X-User-Id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "        proxy_set_header x-user-id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "        proxy_set_header x-userid \$http_x_userid;" >> "$TEMP_FILE"
            HEADER_ADDED=1
        fi
    else
        echo "$line" >> "$TEMP_FILE"
    fi
done < "$NGINX_CONF"

# Заменяем оригинальный файл
mv "$TEMP_FILE" "$NGINX_CONF"
chmod 644 "$NGINX_CONF"

if [ $HEADER_ADDED -eq 1 ]; then
    print_success "Заголовок x-user-id добавлен в конфигурацию"
    
    # Проверка конфигурации
    print_info "Проверка конфигурации Nginx..."
    if nginx -t; then
        print_success "Конфигурация валидна"
        
        # Перезагрузка Nginx
        print_info "Перезагрузка Nginx..."
        systemctl reload nginx
        
        print_success "Nginx перезагружен"
        print_info "Проверьте работу приложения в браузере"
    else
        print_error "Ошибка в конфигурации Nginx!"
        print_info "Восстанавливаем резервную копию..."
        cp "$BACKUP_FILE" "$NGINX_CONF"
        exit 1
    fi
else
    print_warning "Заголовок не был добавлен (возможно, блок location /api не найден)"
fi

