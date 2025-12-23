#!/bin/bash
# Скрипт для исправления конфигурации nginx для правильной обработки файлов с пробелами

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
NGINX_BACKUP="/etc/nginx/sites-available/microclimat-analyzer.backup.$(date +%Y%m%d_%H%M%S)"

echo "Создание резервной копии конфигурации..."
sudo cp "$NGINX_CONF" "$NGINX_BACKUP"

echo "Обновление конфигурации nginx для правильной обработки файлов с пробелами..."

# Создаем временный файл с обновленной конфигурацией
sudo tee /tmp/nginx-uploads-fix.conf > /dev/null <<'EOF'
    # Проксирование загрузок
    location /uploads/ {
        alias /opt/Microclimat_Analyzer/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        # Правильная обработка URL-encoded символов (пробелы, специальные символы)
        disable_symlinks off;
        # Разрешаем доступ к файлам
        try_files $uri =404;
        # Правильная обработка MIME типов для изображений
        types {
            image/png png;
            image/jpeg jpg jpeg;
            image/gif gif;
            image/svg+xml svg;
        }
        default_type application/octet-stream;
    }
EOF

# Заменяем секцию /uploads в конфигурации
sudo sed -i '/location \/uploads {/,/^    }$/c\
    # Проксирование загрузок\
    location /uploads {\
        alias /opt/Microclimat_Analyzer/uploads;\
        expires 1d;\
        add_header Cache-Control "public";\
        disable_symlinks off;\
        try_files $uri =404;\
    }' "$NGINX_CONF"

echo "Проверка конфигурации nginx..."
if sudo nginx -t; then
    echo "Конфигурация корректна. Перезагрузка nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx перезагружен успешно!"
else
    echo "❌ Ошибка в конфигурации. Восстановление из резервной копии..."
    sudo cp "$NGINX_BACKUP" "$NGINX_CONF"
    echo "Конфигурация восстановлена из резервной копии"
    exit 1
fi
