#!/usr/bin/env python3

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

with open(nginx_conf, 'r') as f:
    content = f.read()

# Добавляем блок location /uploads/ перед location /api
uploads_block = '''    # Проксирование загрузок
    location /uploads/ {
        alias /opt/Microclimat_Analyzer/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        disable_symlinks off;
        try_files $uri =404;
    }

'''

# Вставляем перед location /api
content = content.replace('    # Проксирование API запросов', uploads_block + '    # Проксирование API запросов')

with open(nginx_conf, 'w') as f:
    f.write(content)

print("✅ Блок location /uploads/ добавлен")



