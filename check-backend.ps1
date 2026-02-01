# Скрипт для проверки статуса backend-сервера

Write-Host "=== Проверка Backend-сервера ===" -ForegroundColor Green
Write-Host ""

# Проверка PM2
Write-Host "1. Проверка PM2 процессов:" -ForegroundColor Yellow
pm2 list
Write-Host ""

# Проверка порта 3001
Write-Host "2. Проверка порта 3001:" -ForegroundColor Yellow
$connection = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($connection) {
    Write-Host "Порт 3001 занят процессом ID: $($connection.OwningProcess)" -ForegroundColor Green
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Процесс: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Green
    }
} else {
    Write-Host "Порт 3001 НЕ занят!" -ForegroundColor Red
}
Write-Host ""

# Проверка health endpoint
Write-Host "3. Проверка health endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend отвечает!" -ForegroundColor Green
    Write-Host "Статус: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Ответ: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend НЕ отвечает!" -ForegroundColor Red
    Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Просмотр последних логов PM2
Write-Host "4. Последние логи PM2 (20 строк):" -ForegroundColor Yellow
pm2 logs --lines 20 --nostream

Write-Host ""
Write-Host "=== Рекомендации ===" -ForegroundColor Cyan
Write-Host "Если backend не отвечает:" -ForegroundColor Yellow
Write-Host "1. Перезапустите: pm2 restart all" -ForegroundColor White
Write-Host "2. Проверьте логи: pm2 logs --lines 50" -ForegroundColor White
Write-Host "3. Удалите и запустите заново: pm2 delete all && pm2 start npm --name 'microclimat-api' -- run server:prod" -ForegroundColor White

