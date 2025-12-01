# Команды для ручного обновления продакшена (PowerShell)

> **Важно:** Команды в блоках кода выполняются на Linux-сервере через SSH (bash), а не в PowerShell. PowerShell используется только для выполнения SSH-команд с локальной Windows-машины.

## Подключение к серверу
```powershell
ssh stas@192.168.98.42
```

После подключения вы будете в bash на Linux-сервере, а не в PowerShell.

## Шаги обновления

### 1. Переход в директорию проекта
```bash
cd /home/stas/Microclimat_Analyzer
```

> **Примечание:** После подключения через SSH вы находитесь в bash на Linux-сервере. Команды выполняются в bash, а не в PowerShell.

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
echo "159357Stas" | sudo -S chown -R stas:stas /home/stas/Microclimat_Analyzer
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

#### Проверка и остановка конфликтующих процессов
```bash
# Проверка процессов на порту 3001
sudo netstat -tulpn | grep :3001

# Остановка root PM2 (если запущен)
sudo pm2 -u root delete all
sudo pm2 -u root kill

# Остановка всех процессов PM2 пользователя
pm2 delete all

# Остановка всех процессов node/tsx
sudo killall -9 node tsx 2>/dev/null
sudo fuser -k 3001/tcp 2>/dev/null
```

#### Перезапуск PM2 через ecosystem.config.cjs (рекомендуется)
```bash
pm2 start ecosystem.config.cjs
```

#### Или полный перезапуск PM2 вручную
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

## Выполнение из PowerShell (локально)

### Вариант 1: Через SSH с передачей команд
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; git fetch origin; git reset --hard origin/main; git pull origin main; echo '159357Stas' | sudo -S chown -R stas:stas /home/stas/Microclimat_Analyzer; echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null; pm2 delete all; npm install; npm run setup-db; npm run build; pm2 start ecosystem.config.cjs; sleep 10; pm2 status; curl http://localhost:3001/health"
```

### Вариант 2: Пошаговое выполнение
```powershell
# Подключение и обновление кода
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; git fetch origin; git reset --hard origin/main; git pull origin main"

# Исправление прав
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; echo '159357Stas' | sudo -S chown -R stas:stas /home/stas/Microclimat_Analyzer"

# Установка зависимостей
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; npm install"

# Обновление БД
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; npm run setup-db"

# Сборка фронтенда
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; npm run build"

# Остановка конфликтующих процессов
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null; pm2 delete all; echo '159357Stas' | sudo -S killall -9 node tsx 2>/dev/null"

# Перезапуск PM2 через ecosystem.config.cjs
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; pm2 start ecosystem.config.cjs"

# Проверка статуса
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; sleep 10; pm2 status; curl http://localhost:3001/health"
```

### Вариант 3: Использование скрипта PowerShell
```powershell
# Создайте файл update-prod.ps1
$commands = @"
cd /home/stas/Microclimat_Analyzer
git fetch origin
git reset --hard origin/main
git pull origin main
echo '159357Stas' | sudo -S chown -R stas:stas /home/stas/Microclimat_Analyzer
echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null
pm2 delete all
npm install
npm run setup-db
npm run build
pm2 start ecosystem.config.cjs
sleep 10
pm2 status
curl http://localhost:3001/health
"@

ssh -o StrictHostKeyChecking=no stas@192.168.98.42 $commands
```

## В случае проблем

### Остановка всех процессов
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null; pm2 delete all; echo '159357Stas' | sudo -S killall -9 node tsx 2>/dev/null; echo '159357Stas' | sudo -S fuser -k 3001/tcp 2>/dev/null"
```

### Проверка процессов на порту 3001
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "echo '159357Stas' | sudo -S netstat -tulpn 2>/dev/null | grep :3001"
```

### Остановка root PM2 (если конфликтует)
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "echo '159357Stas' | sudo -S pm2 -u root delete all; echo '159357Stas' | sudo -S pm2 -u root kill"
```

### Очистка кэша и пересборка
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; rm -rf node_modules/.cache; rm -rf dist/; npm run build"
```

### Проверка логов
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; pm2 logs microclimat-api --lines 100"
```

### Проверка портов
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "netstat -tlnp | grep 3001"
```

## Полный скрипт PowerShell для локального выполнения

```powershell
# update-prod.ps1
$ErrorActionPreference = "Stop"

$SSH_HOST = "stas@192.168.98.42"
$PROJECT_DIR = "/home/stas/Microclimat_Analyzer"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Обновление Microclimat Analyzer" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Подключение к серверу..." -ForegroundColor Yellow
$commands = @"
cd $PROJECT_DIR
echo '=== Обновление кода ==='
git fetch origin
git reset --hard origin/main
git pull origin main
echo ''
echo '=== Исправление прав ==='
echo '159357Stas' | sudo -S chown -R stas:stas $PROJECT_DIR
echo ''
echo '=== Установка зависимостей ==='
npm install
echo ''
echo '=== Обновление БД ==='
npm run setup-db || echo 'Предупреждение: ошибка обновления БД'
echo ''
echo '=== Сборка фронтенда ==='
npm run build
echo ''
echo '=== Остановка конфликтующих процессов ==='
echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null || true
pm2 delete all || echo '[WARNING] PM2 не найден или не запущен'
echo '159357Stas' | sudo -S killall -9 node tsx 2>/dev/null || true
echo '159357Stas' | sudo -S fuser -k 3001/tcp 2>/dev/null || true
sleep 3
echo ''
echo '=== Перезапуск PM2 ==='
pm2 start ecosystem.config.cjs || pm2 start npm --name microclimat-api --cwd /home/stas/Microclimat_Analyzer -- run server:prod
sleep 10
echo ''
echo '=== Проверка статуса ==='
pm2 status
curl http://localhost:3001/health
echo ''
echo '=== Текущий коммит ==='
git log -1 --format='%H - %s (%ci)'
"@

try {
    ssh -o StrictHostKeyChecking=no $SSH_HOST $commands
    Write-Host ""
    Write-Host "[SUCCESS] Обновление завершено!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "[ERROR] Ошибка при выполнении обновления: $_" -ForegroundColor Red
    exit 1
}
```

## Использование скрипта

Сохраните скрипт в файл `update-prod.ps1` и выполните:
```powershell
.\update-prod.ps1
```

Или выполните команды напрямую в PowerShell:
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "cd /home/stas/Microclimat_Analyzer; git fetch origin; git reset --hard origin/main; git pull origin main; echo '159357Stas' | sudo -S chown -R stas:stas /home/stas/Microclimat_Analyzer; echo '159357Stas' | sudo -S pm2 -u root delete all 2>/dev/null; pm2 delete all; npm install; npm run setup-db; npm run build; pm2 start ecosystem.config.cjs; sleep 10; pm2 status; curl http://localhost:3001/health"
```

## Важные замечания

### Использование ecosystem.config.cjs
Рекомендуется использовать `ecosystem.config.cjs` для запуска PM2, так как он содержит оптимальные настройки:
- Ограничение перезапусков (max_restarts: 3)
- Задержка между перезапусками (restart_delay: 5000)
- Ограничение памяти (max_memory_restart: '500M')
- Правильная обработка ошибок

### Проверка root PM2
Если возникают проблемы с портом 3001, проверьте, не запущен ли PM2 от root:
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "echo '159357Stas' | sudo -S pm2 -u root list"
```

Если есть процессы, остановите их:
```powershell
ssh -o StrictHostKeyChecking=no stas@192.168.98.42 "echo '159357Stas' | sudo -S pm2 -u root delete all; echo '159357Stas' | sudo -S pm2 -u root kill"
```

