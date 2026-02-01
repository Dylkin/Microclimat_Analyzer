#!/usr/bin/env python3
import re

nginx_conf = "/etc/nginx/sites-available/microclimat-analyzer"

try:
    with open(nginx_conf, 'r') as f:
        content = f.read()
    
    # Удаляем старый блок location /uploads
    content = re.sub(r'    # Проксирование загрузок\s+location /uploads[^{]*\{[^}]*\}\s+', '', content, flags=re.DOTALL)
    
    # Добавляем новый блок перед location ~* для статических ресурсов
    content = re.sub(
        r'(    # Кэширование статических ресурсов)',
        r'    # Проксирование загрузок\n    location /uploads/ {\n        alias /opt/Microclimat_Analyzer/uploads/;\n        expires 1d;\n        add_header Cache-Control "public";\n        disable_symlinks off;\n        try_files $uri =404;\n    }\n\n\1',
        content
    )
    
    # Изменяем regex для статических ресурсов, чтобы исключить /uploads/
    # Используем отрицательный lookahead для исключения /uploads/
    content = re.sub(
        r'location ~\* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\\$',
        r'location ~* ^(?!\\/uploads\\/).*\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$',
        content
    )
    
    # Если не сработало, просто удаляем расширения изображений из regex
    if '^(?!\\/uploads\\/)' not in content:
        content = re.sub(
            r'location ~\* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\\$',
            r'location ~* \\.(js|css|ico|svg|woff|woff2|ttf|eot)\\$',
            content
        )
    
    with open(nginx_conf, 'w') as f:
        f.write(content)
    
    print("✅ Конфигурация обновлена")
except Exception as e:
    print(f"❌ Ошибка: {e}")
    exit(1)


