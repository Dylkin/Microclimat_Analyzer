# Скрипт для обновления продакшена через PowerShell
# Использование: .\update-prod.ps1

$ErrorActionPreference = "Stop"

$SSH_HOST = "stas@192.168.98.42"
$PROJECT_DIR = "/home/stas/Microclimat_Analyzer"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Обновление Microclimat Analyzer" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Подключение к серверу: $SSH_HOST" -ForegroundColor Yellow
Write-Host "[INFO] Директория проекта: $PROJECT_DIR" -ForegroundColor Yellow
Write-Host ""

# Формируем команды для выполнения на сервере
$commands = @"
cd $PROJECT_DIR || exit 1

echo "======================================"
echo "  Обновление Microclimat Analyzer"
echo "======================================"
echo ""

# Обновление кода
echo "[INFO] Обновление кода из Git..."
git fetch origin || exit 1
git reset --hard origin/main || exit 1
git pull origin main || exit 1
echo "[SUCCESS] Код обновлен"
echo ""

# Исправление прав доступа
echo "[INFO] Исправление прав доступа..."
echo '159357Stas' | sudo -S chown -R stas:stas $PROJECT_DIR || echo "[WARNING] Не удалось изменить права"
echo ""

# Установка зависимостей
echo "[INFO] Установка/обновление зависимостей..."
npm install || exit 1
echo "[SUCCESS] Зависимости установлены"
echo ""

# Обновление БД
echo "[INFO] Обновление структуры базы данных..."
npm run setup-db || echo "[WARNING] Ошибка обновления БД, продолжаем..."
echo ""

# Сборка фронтенда
echo "[INFO] Сборка фронтенда..."
npm run build || exit 1
echo "[SUCCESS] Фронтенд собран"
echo ""

# Перезапуск сервисов
echo "[INFO] Перезапуск сервисов..."
pm2 restart all || echo "[WARNING] PM2 не найден или не запущен"
sudo systemctl restart microclimat-api 2>/dev/null || true
sudo systemctl restart nginx 2>/dev/null || true
echo "[SUCCESS] Сервисы перезапущены"
echo ""

# Проверка статуса
echo "[INFO] Проверка статуса..."
sleep 5
pm2 status
curl -s http://localhost:3001/health || echo "[WARNING] Health check не прошел"
echo ""

# Информация о коммите
echo "[INFO] Текущий коммит:"
git log -1 --format="%H - %s (%ci)"
echo ""

echo "======================================"
echo "[SUCCESS] Обновление завершено!"
echo "======================================"
"@

try {
    # Выполняем команды на удаленном сервере
    ssh -o StrictHostKeyChecking=no $SSH_HOST $commands
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Обновление успешно выполнено на сервере" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Ошибка при выполнении обновления (код выхода: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Ошибка при подключении к серверу: $_" -ForegroundColor Red
    exit 1
}
