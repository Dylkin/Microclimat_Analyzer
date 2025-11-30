#!/bin/bash
# ================================
# Скрипт для исправления конфигурации Nginx
# Добавляет передачу заголовка x-user-id
# ================================

set -e

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"

# Проверка прав
if [ "$EUID" -ne 0 ]; then
    echo "Скрипт должен быть запущен с правами root или через sudo"
    exit 1
fi

echo "Исправление конфигурации Nginx..."
echo ""

# Создаем резервную копию
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "Резервная копия создана"

# Проверяем, есть ли уже нужные строки
if grep -q "proxy_set_header.*X-User-Id\|proxy_set_header.*x-user-id" "$NGINX_CONF"; then
    echo "Заголовок уже присутствует в конфигурации"
    echo ""
    echo "Текущая конфигурация location /api:"
    grep -A 15 "location /api" "$NGINX_CONF" | head -20
    exit 0
fi

# Создаем временный файл
TEMP_FILE=$(mktemp)

# Обрабатываем файл
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
            echo "    # Передача заголовка x-user-id для аутентификации" >> "$TEMP_FILE"
            echo "    proxy_pass_request_headers on;" >> "$TEMP_FILE"
            echo "    proxy_set_header X-User-Id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "    proxy_set_header x-user-id \$http_x_user_id;" >> "$TEMP_FILE"
            HEADER_ADDED=1
        fi
        IN_API_BLOCK=0
        echo "$line" >> "$TEMP_FILE"
    # Если мы в блоке /api и встречаем proxy_set_header X-Forwarded-Proto, добавляем после него
    elif [ $IN_API_BLOCK -eq 1 ] && [[ "$line" =~ proxy_set_header.*X-Forwarded-Proto ]]; then
        echo "$line" >> "$TEMP_FILE"
        if [ $HEADER_ADDED -eq 0 ]; then
            echo "    # Передача заголовка x-user-id для аутентификации" >> "$TEMP_FILE"
            echo "    proxy_pass_request_headers on;" >> "$TEMP_FILE"
            echo "    proxy_set_header X-User-Id \$http_x_user_id;" >> "$TEMP_FILE"
            echo "    proxy_set_header x-user-id \$http_x_user_id;" >> "$TEMP_FILE"
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
    echo "✅ Заголовок x-user-id добавлен в конфигурацию"
    echo ""
    echo "Обновленная конфигурация location /api:"
    grep -A 20 "location /api" "$NGINX_CONF" | head -25
    echo ""
    echo "Проверка конфигурации..."
    if nginx -t; then
        echo "✅ Конфигурация корректна"
        echo ""
        echo "Перезагрузка Nginx..."
        systemctl reload nginx
        echo "✅ Nginx перезагружен"
    else
        echo "❌ Ошибка в конфигурации! Восстанавливаем резервную копию..."
        cp "${NGINX_CONF}.backup."* "$NGINX_CONF" 2>/dev/null || true
        exit 1
    fi
else
    echo "⚠️  Не удалось автоматически добавить заголовок"
    echo "Требуется ручное редактирование файла: $NGINX_CONF"
    exit 1
fi

echo ""
echo "✅ Исправление завершено!"

