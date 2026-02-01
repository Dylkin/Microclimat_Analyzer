# Инструкция по исправлению конфигурации nginx для файлов верификации

## Проблема
Файлы верификации возвращают 404 ошибку из-за неправильной конфигурации nginx.

## Решение

На сервере выполните следующие команды:

```bash
# 1. Создайте резервную копию
sudo cp /etc/nginx/sites-available/microclimat-analyzer /etc/nginx/sites-available/microclimat-analyzer.backup

# 2. Отредактируйте конфигурацию
sudo nano /etc/nginx/sites-available/microclimat-analyzer
```

Найдите секцию:
```nginx
    location /uploads {
        alias /opt/Microclimat_Analyzer/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }
```

Замените на:
```nginx
    location /uploads/ {
        alias /opt/Microclimat_Analyzer/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        disable_symlinks off;
        try_files $uri =404;
    }
```

**Важно:** Оба пути (`location` и `alias`) должны заканчиваться на `/`

# 3. Проверьте конфигурацию
sudo nginx -t

# 4. Перезагрузите nginx
sudo systemctl reload nginx
```

## Альтернативное решение (использование root вместо alias)

Если проблема сохраняется, можно использовать `root`:

```nginx
    location /uploads/ {
        root /opt/Microclimat_Analyzer;
        expires 1d;
        add_header Cache-Control "public";
        disable_symlinks off;
        try_files $uri =404;
    }
```

В этом случае nginx будет искать файлы по пути: `/opt/Microclimat_Analyzer/uploads/...`
