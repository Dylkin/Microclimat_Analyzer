# Команды для ручного обновления продакшена

## Подключение к серверу
```bash
ssh stas@192.168.98.42
```

## Шаги обновления

### 1. Переход в директорию проекта
```bash
cd /home/stas/Microclimat_Analyzer
```

### 2. Обновление кода из GitHub
```bash
# Получение последних изменений
git fetch origin

# Сброс локальных изменений (если есть)
git reset --hard origin/main

# Обновление кода
git pull origin main

# Проверка текущего коммита
git log -1 --oneline
```

### 3. Исправление прав доступа (если необходимо)
```bash
sudo chown -R stas:stas /home/stas/Microclimat_Analyzer
```

### 4. Установка/обновление зависимостей
```bash
npm install
```

### 5. Обновление структуры базы данных
```bash
npm run setup-db
```

### 6. Сборка фронтенда
```bash
npm run build
```

### 7. Перезапуск сервисов

#### Перезапуск PM2
```bash
pm2 restart all
```

#### Или полный перезапуск PM2
```bash
pm2 delete all
pm2 start npm --name microclimat-api --cwd /home/stas/Microclimat_Analyzer -- run server:prod
```

#### Перезапуск Nginx (если необходимо)
```bash
sudo systemctl restart nginx
```

### 8. Проверка статуса

#### Проверка статуса PM2
```bash
pm2 status
pm2 logs microclimat-api --lines 50
```

#### Проверка работы API
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/release/info
```

#### Проверка версии и коммита
```bash
git log -1 --format="%H - %s (%ci)"
```

## Полная последовательность команд (одной строкой)

```bash
cd /home/stas/Microclimat_Analyzer && \
git fetch origin && \
git reset --hard origin/main && \
git pull origin main && \
sudo chown -R stas:stas /home/stas/Microclimat_Analyzer && \
npm install && \
npm run setup-db && \
npm run build && \
pm2 restart all && \
sleep 5 && \
pm2 status && \
curl http://localhost:3001/health
```

## В случае проблем

### Остановка всех процессов
```bash
pm2 delete all
sudo killall -9 node tsx 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
```

### Очистка кэша и пересборка
```bash
rm -rf node_modules/.cache
rm -rf dist/
npm run build
```

### Проверка логов
```bash
pm2 logs microclimat-api --lines 100
cat /home/stas/.pm2/logs/microclimat-api-error.log | tail -50
```

### Проверка портов
```bash
netstat -tlnp | grep 3001
# или
ss -tlnp | grep 3001
```


