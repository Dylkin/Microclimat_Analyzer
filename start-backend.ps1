# Скрипт для запуска backend-сервера

Write-Host "=== Запуск Backend-сервера ===" -ForegroundColor Green

# Проверка наличия .env файла
if (-not (Test-Path .env)) {
    Write-Host "ОШИБКА: Файл .env не найден!" -ForegroundColor Red
    Write-Host "Создайте файл .env с настройками базы данных" -ForegroundColor Yellow
    exit 1
}

# Проверка, не запущен ли уже backend
$port = 3001
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Порт $port уже занят. Остановите существующий процесс или измените PORT в .env" -ForegroundColor Yellow
    Write-Host "Запущенные процессы Node.js:" -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Format-Table ProcessName, Id, CPU
    $answer = Read-Host "Остановить все процессы Node.js? (y/n)"
    if ($answer -eq "y") {
        Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
        Start-Sleep -Seconds 2
    } else {
        exit 1
    }
}

# Проверка установки зависимостей
if (-not (Test-Path node_modules)) {
    Write-Host "Установка зависимостей..." -ForegroundColor Yellow
    npm install
}

Write-Host "Запуск backend-сервера на порту $port..." -ForegroundColor Green
Write-Host "Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Запуск сервера
npm run server

