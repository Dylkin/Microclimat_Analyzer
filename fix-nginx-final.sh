#!/bin/bash
# Финальный скрипт для исправления конфигурации nginx

NGINX_CONF="/etc/nginx/sites-available/microclimat-analyzer"

python3 << 'PYTHON_SCRIPT'
import re

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

try:
    with open(nginx_conf, 'r') as f:
        content = f.read()
    
    # Заменяем всю секцию location /uploads
    pattern = r'    location /uploads[^{]*\{[^}]*\}'
    replacement = '''    location /uploads/ {
        alias /opt/Microclimat_Analyzer/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        disable_symlinks off;
        try_files $uri =404;
    }'''
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(nginx_conf, 'w') as f:
        f.write(content)
    
    print("✅ Конфигурация обновлена")
except Exception as e:
    print(f"❌ Ошибка: {e}")
    exit(1)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    nginx -t && systemctl reload nginx && echo "✅ Nginx перезагружен!"
else
    exit 1
fi


