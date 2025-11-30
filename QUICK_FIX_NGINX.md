# Быстрое исправление конфигурации Nginx

## Проблема
Заголовок `x-user-id` не передается на backend (`'x-user-id': undefined` в логах).

## Решение (выполнить на сервере)

### Шаг 1: Откройте конфигурационный файл Nginx

```bash
sudo nano /etc/nginx/sites-available/microclimat-analyzer
```

### Шаг 2: Найдите блок `location /api` и добавьте строки

Найдите блок, который выглядит примерно так:

```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Добавьте после строки `proxy_set_header X-Forwarded-Proto $scheme;` следующие строки:**

```nginx
    # Передача заголовка x-user-id для аутентификации
    proxy_pass_request_headers on;
    proxy_set_header X-User-Id $http_x_user_id;
    proxy_set_header x-user-id $http_x_user_id;
```

**Итоговый блок должен выглядеть так:**

```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Передача заголовка x-user-id для аутентификации
    proxy_pass_request_headers on;
    proxy_set_header X-User-Id $http_x_user_id;
    proxy_set_header x-user-id $http_x_user_id;
    proxy_cache_bypass $http_upgrade;
}
```

### Шаг 3: Сохраните файл

В nano: `Ctrl+O` (сохранить), `Enter` (подтвердить), `Ctrl+X` (выйти)

### Шаг 4: Проверьте и перезагрузите Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 5: Проверьте работу

Откройте приложение в браузере и проверьте, исчезла ли ошибка `401 (Unauthorized)`.

## Альтернатива: одна команда (если файл называется microclimat-analyzer)

```bash
sudo sed -i '/proxy_set_header X-Forwarded-Proto/a\    proxy_pass_request_headers on;\n    proxy_set_header X-User-Id $http_x_user_id;\n    proxy_set_header x-user-id $http_x_user_id;' /etc/nginx/sites-available/microclimat-analyzer && sudo nginx -t && sudo systemctl reload nginx
```

