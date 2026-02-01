#!/bin/bash
# Простой скрипт для исправления конфигурации nginx

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"

# Создаем резервную копию
sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Используем Python для более надежной замены
sudo python3 << 'PYTHON_SCRIPT'
import re
import sys

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

try:
    with open(nginx_conf, 'r') as f:
        content = f.read()
    
    # Заменяем секцию /uploads
    pattern = r'    # Проксирование загрузок\s+location /uploads \{[^}]+\}'
    replacement = '''    # Проксирование загрузок
    location /uploads/ {
        alias /opt/Microclimat_Analyzer/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        disable_symlinks off;
        try_files $uri =404;
    }'''
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content == content:
        # Если не нашлось, ищем другой паттерн
        pattern2 = r'    location /uploads \{[^}]+\}'
        new_content = re.sub(pattern2, replacement, content, flags=re.DOTALL)
    
    with open(nginx_conf, 'w') as f:
        f.write(new_content)
    
    print("Конфигурация обновлена")
    sys.exit(0)
except Exception as e:
    print(f"Ошибка: {e}")
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo "Проверка конфигурации nginx..."
    if sudo nginx -t; then
        echo "Конфигурация корректна. Перезагрузка nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx перезагружен успешно!"
    else
        echo "❌ Ошибка в конфигурации"
        exit 1
    fi
else
    echo "❌ Ошибка при обновлении конфигурации"
    exit 1
fi
