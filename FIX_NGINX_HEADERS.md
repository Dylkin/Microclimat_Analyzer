# Исправление передачи заголовков через Nginx

## Проблема
Ошибка `401 (Unauthorized)` при запросах к `/api/projects` на продакшене из-за того, что заголовок `x-user-id` не передается на backend через Nginx.

## Решение

Нужно обновить конфигурацию Nginx, чтобы передавать заголовок `x-user-id` на backend.

### Шаг 1: Найти конфигурационный файл Nginx

```bash
# Обычно находится в одном из этих мест:
ls /etc/nginx/sites-available/
ls /etc/nginx/conf.d/
```

### Шаг 2: Отредактировать конфигурацию

Найдите блок `location /api` и добавьте передачу заголовка `x-user-id`:

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
    
    # Добавить эти строки для передачи заголовка x-user-id
    # В Nginx заголовки преобразуются: x-user-id → $http_x_user_id
    proxy_set_header X-User-Id $http_x_user_id;
    # Также пробуем другие варианты на случай нормализации заголовков
    proxy_set_header x-user-id $http_x_user_id;
    proxy_set_header x-userid $http_x_userid;
    # Включаем передачу всех заголовков от клиента
    proxy_pass_request_headers on;
    
    proxy_cache_bypass $http_upgrade;
}
```

### Шаг 3: Проверить и перезагрузить Nginx

```bash
# Проверить конфигурацию
sudo nginx -t

# Если проверка прошла успешно, перезагрузить Nginx
sudo systemctl reload nginx
```

### Шаг 4: Проверить работу

После перезагрузки Nginx ошибка `401 (Unauthorized)` должна исчезнуть.

## Альтернативное решение (если не помогает)

Если проблема сохраняется, можно также добавить передачу всех заголовков:

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
    
    # Передавать все заголовки от клиента
    proxy_pass_request_headers on;
    proxy_set_header X-User-Id $http_x_user_id;
    proxy_set_header X-Userid $http_x_userid;
    proxy_set_header User-Id $http_user_id;
    
    proxy_cache_bypass $http_upgrade;
}
```

