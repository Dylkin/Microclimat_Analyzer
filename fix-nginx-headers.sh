#!/bin/bash
# ================================
# Скрипт для исправления передачи заголовков через Nginx
# Microclimat Analyzer
# ================================

set -e

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
NGINX_CONF_ALT="/etc/nginx/sites-available/default"
NGINX_CONF_ALT2="/etc/nginx/conf.d/microclimat.conf"

# Функции для цветного вывода
print_info() {
    printf "\033[0;36m[INFO]\033[0m %s\n" "$1"
}

print_success() {
    printf "\033[0;32m[SUCCESS]\033[0m %s\n" "$1"
}

print_error() {
    printf "\033[0;31m[ERROR]\033[0m %s\n" "$1"
}

print_warning() {
    printf "\033[0;33m[WARNING]\033[0m %s\n" "$1"
}

# Поиск конфигурационного файла
find_nginx_conf() {
    if [ -f "$NGINX_CONF" ]; then
        echo "$NGINX_CONF"
    elif [ -f "$NGINX_CONF_ALT" ]; then
        echo "$NGINX_CONF_ALT"
    elif [ -f "$NGINX_CONF_ALT2" ]; then
        echo "$NGINX_CONF_ALT2"
    else
        print_error "Конфигурационный файл Nginx не найден!"
        print_info "Ищем файлы конфигурации..."
        find /etc/nginx -name "*.conf" -type f 2>/dev/null | grep -E "(microclimat|default)" | head -5
        return 1
    fi
}

# Проверка наличия необходимой строки
check_header() {
    local conf_file=$1
    if grep -q "proxy_set_header X-User-Id" "$conf_file" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Добавление заголовка в конфигурацию
add_header() {
    local conf_file=$1
    
    print_info "Создание резервной копии конфигурации..."
    sudo cp "$conf_file" "${conf_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_info "Добавление заголовка X-User-Id в конфигурацию..."
    
    # Создаем временный файл с исправленной конфигурацией
    local temp_file=$(mktemp)
    
    # Обрабатываем файл построчно
    local in_api_block=0
    local header_added=0
    
    while IFS= read -r line || [ -n "$line" ]; do
        # Проверяем, находимся ли мы в блоке location /api
        if [[ "$line" =~ location\ /api ]]; then
            in_api_block=1
            echo "$line" >> "$temp_file"
        elif [[ "$line" =~ ^[[:space:]]*\} ]] && [ $in_api_block -eq 1 ]; then
            # Если мы в блоке /api и еще не добавили заголовок, добавляем его перед закрывающей скобкой
            if [ $header_added -eq 0 ]; then
                echo "    proxy_set_header X-User-Id \$http_x_user_id;" >> "$temp_file"
                echo "    proxy_pass_request_headers on;" >> "$temp_file"
                header_added=1
            fi
            in_api_block=0
            echo "$line" >> "$temp_file"
        elif [ $in_api_block -eq 1 ] && [[ "$line" =~ proxy_set_header.*X-Forwarded-Proto ]]; then
            # Добавляем заголовок после X-Forwarded-Proto
            echo "$line" >> "$temp_file"
            echo "    proxy_set_header X-User-Id \$http_x_user_id;" >> "$temp_file"
            echo "    proxy_pass_request_headers on;" >> "$temp_file"
            header_added=1
        else
            echo "$line" >> "$temp_file"
        fi
    done < "$conf_file"
    
    # Заменяем оригинальный файл
    sudo mv "$temp_file" "$conf_file"
    sudo chown root:root "$conf_file"
    sudo chmod 644 "$conf_file"
    
    if [ $header_added -eq 1 ]; then
        print_success "Заголовок X-User-Id добавлен в конфигурацию"
        return 0
    else
        print_warning "Не удалось автоматически добавить заголовок. Требуется ручное редактирование."
        return 1
    fi
}

# Основная функция
main() {
    echo ""
    echo "======================================"
    echo "  Исправление конфигурации Nginx"
    echo "======================================"
    echo ""
    
    # Проверка прав
    if [ "$EUID" -ne 0 ]; then
        print_error "Скрипт должен быть запущен с правами root или через sudo"
        exit 1
    fi
    
    # Поиск конфигурационного файла
    print_info "Поиск конфигурационного файла Nginx..."
    nginx_conf=$(find_nginx_conf)
    
    if [ $? -ne 0 ] || [ -z "$nginx_conf" ]; then
        print_error "Не удалось найти конфигурационный файл"
        exit 1
    fi
    
    print_success "Найден конфигурационный файл: $nginx_conf"
    
    # Проверка наличия заголовка
    if check_header "$nginx_conf"; then
        print_success "Заголовок X-User-Id уже присутствует в конфигурации"
        print_info "Проверка конфигурации..."
    else
        print_info "Заголовок X-User-Id отсутствует. Добавляем..."
        if add_header "$nginx_conf"; then
            print_success "Заголовок добавлен"
        else
            print_error "Не удалось добавить заголовок автоматически"
            print_info "См. файл FIX_NGINX_HEADERS.md для ручного исправления"
            exit 1
        fi
    fi
    
    # Проверка конфигурации
    print_info "Проверка конфигурации Nginx..."
    if nginx -t; then
        print_success "Конфигурация корректна"
    else
        print_error "Ошибка в конфигурации Nginx!"
        print_info "Восстанавливаем резервную копию..."
        sudo cp "${nginx_conf}.backup."* "$nginx_conf" 2>/dev/null || true
        exit 1
    fi
    
    # Перезагрузка Nginx
    print_info "Перезагрузка Nginx..."
    if systemctl reload nginx; then
        print_success "Nginx перезагружен"
    else
        print_error "Ошибка при перезагрузке Nginx"
        exit 1
    fi
    
    echo ""
    echo "======================================"
    print_success "Исправление завершено!"
    echo "======================================"
    echo ""
    print_info "Теперь заголовок x-user-id будет передаваться на backend"
    echo ""
}

main

