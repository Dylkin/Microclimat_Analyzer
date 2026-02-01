#!/usr/bin/env python3
import re

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

with open(nginx_conf, 'r') as f:
    content = f.read()

# Удаляем расширения изображений (png, jpg, jpeg, gif) из regex для статических ресурсов
# Ищем строку с расширениями и заменяем
old_pattern = r'location ~\* \\.\(js\|css\|png\|jpg\|jpeg\|gif\|ico\|svg\|woff\|woff2\|ttf\|eot\)\\$'
new_pattern = r'location ~* \\.(js|css|ico|svg|woff|woff2|ttf|eot)$'

# Простая замена строки
content = content.replace(
    'location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$',
    'location ~* \\.(js|css|ico|svg|woff|woff2|ttf|eot)$'
)

with open(nginx_conf, 'w') as f:
    f.write(content)

print("✅ Расширения изображений удалены из regex статических ресурсов")


