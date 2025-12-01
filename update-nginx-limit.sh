#!/bin/bash
# Скрипт для обновления лимита загрузки файлов в Nginx
# Обновляет как основной nginx.conf, так и конфигурацию виртуального хоста

NGINX_MAIN="/etc/nginx/nginx.conf"
NGINX_SITE="/etc/nginx/sites-available/microclimat-analyzer"

if [ ! -f "$NGINX_MAIN" ]; then
    echo "Ошибка: файл $NGINX_MAIN не найден"
    exit 1
fi

if [ ! -f "$NGINX_SITE" ]; then
    echo "Ошибка: файл $NGINX_SITE не найден"
    exit 1
fi

# Резервные копии
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)
cp "$NGINX_MAIN" "${NGINX_MAIN}.bak.${BACKUP_SUFFIX}"
cp "$NGINX_SITE" "${NGINX_SITE}.bak.${BACKUP_SUFFIX}"

# Обновляем основной nginx.conf в блоке http
if grep -q "client_max_body_size" "$NGINX_MAIN"; then
    echo "Обновляем существующий client_max_body_size в nginx.conf..."
    sed -i 's/client_max_body_size.*/client_max_body_size 200M;/' "$NGINX_MAIN"
else
    echo "Добавляем client_max_body_size 200M в nginx.conf..."
    sed -i '/^http {/a\    client_max_body_size 200M;' "$NGINX_MAIN"
fi

# Обновляем конфигурацию виртуального хоста
if grep -q "client_max_body_size" "$NGINX_SITE"; then
    echo "Обновляем существующий client_max_body_size в виртуальном хосте..."
    sed -i 's/client_max_body_size.*/client_max_body_size 200M;/' "$NGINX_SITE"
else
    echo "Добавляем client_max_body_size 200M в виртуальный хост..."
    sed -i '/server_name/a\    client_max_body_size 200M;' "$NGINX_SITE"
fi

# Проверка синтаксиса
if nginx -t; then
    echo "Синтаксис Nginx корректен. Перезагружаем Nginx..."
    systemctl reload nginx
    echo ""
    echo "✅ Готово! Лимит загрузки файлов установлен на 200MB."
    echo ""
    echo "Проверка настроек:"
    grep "client_max_body_size" "$NGINX_MAIN" "$NGINX_SITE" 2>/dev/null
else
    echo "❌ Ошибка в синтаксисе Nginx. Восстанавливаем резервные копии..."
    cp "${NGINX_MAIN}.bak.${BACKUP_SUFFIX}" "$NGINX_MAIN"
    cp "${NGINX_SITE}.bak.${BACKUP_SUFFIX}" "$NGINX_SITE"
    exit 1
fi


