#!/bin/bash
# Добавление proxy_pass_request_headers on в конфигурацию Nginx

NGINX_CONF="/etc/nginx/sites-available/microclimat"

# Создаем резервную копию
cp "$NGINX_CONF" "${NGINX_CONF}.backup3.$(date +%Y%m%d_%H%M%S)"

# Проверяем, есть ли уже proxy_pass_request_headers
if grep -q "proxy_pass_request_headers on" "$NGINX_CONF"; then
    echo "proxy_pass_request_headers on уже присутствует"
    exit 0
fi

# Добавляем proxy_pass_request_headers on после proxy_set_header X-Forwarded-Proto
sed -i '/proxy_set_header X-Forwarded-Proto/a\    proxy_pass_request_headers on;' "$NGINX_CONF"

# Проверяем конфигурацию
if nginx -t; then
    systemctl reload nginx
    echo "✅ proxy_pass_request_headers on добавлен и Nginx перезагружен"
    echo ""
    echo "Проверка блока location /api:"
    grep -A 20 "location /api" "$NGINX_CONF" | head -25
else
    echo "❌ Ошибка в конфигурации! Восстанавливаем резервную копию..."
    cp "${NGINX_CONF}.backup3."* "$NGINX_CONF" 2>/dev/null || true
    exit 1
fi

