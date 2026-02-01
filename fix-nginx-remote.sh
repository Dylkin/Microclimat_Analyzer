#!/bin/bash
# Скрипт для исправления конфигурации Nginx на сервере

NGINX_CONF="/etc/nginx/sites-available/microclimat"

# Создаем резервную копию
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Проверяем, есть ли уже нужные строки
if grep -q "proxy_set_header.*x-user-id" "$NGINX_CONF"; then
    echo "Заголовок уже присутствует в конфигурации"
    exit 0
fi

# Используем awk для добавления строк после X-Forwarded-Proto
awk '
/proxy_set_header X-Forwarded-Proto/ {
    print $0
    print "    proxy_pass_request_headers on;"
    print "    proxy_set_header X-User-Id $http_x_user_id;"
    print "    proxy_set_header x-user-id $http_x_user_id;"
    next
}
{ print }
' "$NGINX_CONF" > "${NGINX_CONF}.tmp" && mv "${NGINX_CONF}.tmp" "$NGINX_CONF"

# Проверяем конфигурацию
if nginx -t; then
    systemctl reload nginx
    echo "✅ Nginx обновлен и перезагружен"
else
    echo "❌ Ошибка в конфигурации! Восстанавливаем резервную копию..."
    cp "${NGINX_CONF}.backup."* "$NGINX_CONF" 2>/dev/null || true
    exit 1
fi

