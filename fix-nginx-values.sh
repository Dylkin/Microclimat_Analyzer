#!/bin/bash
# Исправление значений заголовков в конфигурации Nginx

NGINX_CONF="/etc/nginx/sites-available/microclimat"

# Создаем резервную копию
cp "$NGINX_CONF" "${NGINX_CONF}.backup2.$(date +%Y%m%d_%H%M%S)"

# Исправляем пустые значения заголовков
sed -i 's/proxy_set_header X-User-Id ;/proxy_set_header X-User-Id $http_x_user_id;/g' "$NGINX_CONF"
sed -i 's/proxy_set_header x-user-id ;/proxy_set_header x-user-id $http_x_user_id;/g' "$NGINX_CONF"

# Удаляем дубликаты proxy_pass_request_headers
sed -i '/proxy_pass_request_headers on;/N;/proxy_pass_request_headers on;\n/d' "$NGINX_CONF"

# Проверяем конфигурацию
if nginx -t; then
    systemctl reload nginx
    echo "✅ Конфигурация исправлена и Nginx перезагружен"
    echo ""
    echo "Проверка блока location /api:"
    grep -A 15 "location /api" "$NGINX_CONF" | head -20
else
    echo "❌ Ошибка в конфигурации! Восстанавливаем резервную копию..."
    cp "${NGINX_CONF}.backup2."* "$NGINX_CONF" 2>/dev/null || true
    exit 1
fi

