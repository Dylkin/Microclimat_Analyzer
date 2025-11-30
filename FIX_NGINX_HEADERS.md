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

Если проблема сохраняется, попробуйте использовать более полную конфигурацию:

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
    
    # ВАЖНО: Передавать все заголовки от клиента
    proxy_pass_request_headers on;
    
    # Передавать заголовок x-user-id в разных форматах
    # В Nginx заголовки преобразуются: x-user-id → $http_x_user_id
    proxy_set_header X-User-Id $http_x_user_id;
    proxy_set_header x-user-id $http_x_user_id;
    proxy_set_header x-userid $http_x_userid;
    proxy_set_header User-Id $http_user_id;
    
    # Также передаем заголовок как есть (если приходит с заглавной буквы)
    proxy_set_header X-User-Id $http_X_User_Id;
    
    proxy_cache_bypass $http_upgrade;
}
```

## Диагностика проблемы

Если ошибка сохраняется, выполните на сервере:

```bash
# 1. Проверьте логи backend
pm2 logs microclimat-api --lines 100 | grep -i "авторизац\|x-user-id"

# 2. Проверьте, что заголовок отправляется с фронтенда
# Откройте консоль браузера (F12) и проверьте вкладку Network
# Найдите запрос к /api/projects и проверьте заголовки Request Headers

# 3. Проверьте конфигурацию Nginx
sudo nginx -t
sudo cat /etc/nginx/sites-available/microclimat-analyzer | grep -A 15 "location /api"

# 4. Выполните тестовый запрос напрямую к backend (минуя Nginx)
curl -H "x-user-id: test-id" http://localhost:3001/api/projects?userId=test-id
```

## Важно

После изменения конфигурации Nginx обязательно:
1. Проверьте конфигурацию: `sudo nginx -t`
2. Перезагрузите Nginx: `sudo systemctl reload nginx`
3. Перезапустите backend: `pm2 restart microclimat-api`
4. Очистите кэш браузера и перезагрузите страницу

