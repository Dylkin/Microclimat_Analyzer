#!/bin/bash
# Скрипт для исправления конфигурации nginx

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"
NGINX_BACKUP="/etc/nginx/sites-available/microclimat-analyzer.backup.$(date +%Y%m%d_%H%M%S)"

echo "Создание резервной копии конфигурации..."
cp "$NGINX_CONF" "$NGINX_BACKUP"

echo "Обновление конфигурации nginx..."

# Используем Python для надежной замены
python3 << 'PYTHON_SCRIPT'
import re

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

try:
    with open(nginx_conf, 'r') as f:
        content = f.read()
    
    # Заменяем location /uploads { на location /uploads/ {
    content = re.sub(r'location /uploads \{', 'location /uploads/ {', content)
    
    # Заменяем alias /opt/Microclimat_Analyzer/uploads; на alias /opt/Microclimat_Analyzer/uploads/;
    content = re.sub(r'alias /opt/Microclimat_Analyzer/uploads;', 'alias /opt/Microclimat_Analyzer/uploads/;', content)
    
    # Добавляем disable_symlinks off; и try_files $uri =404; перед закрывающей скобкой location /uploads/
    # Ищем секцию location /uploads/ и добавляем нужные директивы
    pattern = r'(location /uploads/ \{[^\}]*add_header Cache-Control "public";)(\s+\})'
    replacement = r'\1\n        disable_symlinks off;\n        try_files $uri =404;\2'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(nginx_conf, 'w') as f:
        f.write(content)
    
    print("✅ Конфигурация обновлена")
except Exception as e:
    print(f"❌ Ошибка: {e}")
    exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo "Проверка конфигурации nginx..."
    if nginx -t; then
        echo "Конфигурация корректна. Перезагрузка nginx..."
        systemctl reload nginx
        echo "✅ Nginx перезагружен успешно!"
    else
        echo "❌ Ошибка в конфигурации. Восстановление из резервной копии..."
        cp "$NGINX_BACKUP" "$NGINX_CONF"
        echo "Конфигурация восстановлена из резервной копии"
        exit 1
    fi
else
    echo "❌ Ошибка при обновлении конфигурации"
    exit 1
fi
