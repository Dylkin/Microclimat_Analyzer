@echo off
REM ================================
REM Скрипт удаленного обновления продакшена
REM Microclimat Analyzer (Windows Batch)
REM ================================

setlocal enabledelayedexpansion

set SSH_HOST=stas@192.168.98.42
set PROJECT_DIR=/home/stas/Microclimat_Analyzer

if not "%1"=="" set SSH_HOST=%1
if not "%2"=="" set PROJECT_DIR=%2

echo.
echo [INFO] Подключение к серверу: %SSH_HOST%
echo [INFO] Директория проекта: %PROJECT_DIR%
echo.

REM Проверка наличия SSH
where ssh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] SSH не найден. Установите OpenSSH или используйте PuTTY
    echo [INFO] Для Windows 10/11: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    exit /b 1
)

echo [INFO] Выполнение обновления на удаленном сервере...
echo.

REM Создаем временный файл с командами
set TEMP_SCRIPT=%TEMP%\update-prod-remote-commands.sh
(
    echo cd %PROJECT_DIR% ^|^| exit 1
    echo.
    echo echo "======================================"
    echo echo "  Обновление Microclimat Analyzer"
    echo echo "======================================"
    echo echo.
    echo echo "[INFO] Обновление кода из Git..."
    echo git pull origin main ^|^| exit 1
    echo echo "[SUCCESS] Код обновлен"
    echo echo.
    echo echo "[INFO] Установка/обновление зависимостей..."
    echo npm install ^|^| exit 1
    echo echo "[SUCCESS] Зависимости установлены"
    echo echo.
    echo echo "[INFO] Обновление структуры базы данных..."
    echo npm run setup-db ^|^| echo "[WARNING] Ошибка обновления БД, продолжаем..."
    echo echo.
    echo echo "[INFO] Сборка фронтенда..."
    echo npm run build ^|^| exit 1
    echo echo "[SUCCESS] Фронтенд собран"
    echo echo.
    echo echo "[INFO] Перезапуск сервисов..."
    echo pm2 restart all ^|^| echo "[WARNING] PM2 не найден или не запущен"
    echo sudo systemctl restart microclimat-api 2^>^/dev/null ^|^| true
    echo sudo systemctl restart nginx 2^>^/dev/null ^|^| true
    echo echo "[SUCCESS] Сервисы перезапущены"
    echo echo.
    echo echo "======================================"
    echo echo "[SUCCESS] Обновление завершено!"
    echo echo "======================================"
) > "%TEMP_SCRIPT%"

REM Выполняем команды через SSH
ssh %SSH_HOST% "bash -s" < "%TEMP_SCRIPT%"

set EXIT_CODE=%ERRORLEVEL%

REM Удаляем временный файл
del "%TEMP_SCRIPT%" >nul 2>&1

if %EXIT_CODE% EQU 0 (
    echo.
    echo [SUCCESS] Обновление успешно выполнено на сервере
    exit /b 0
) else (
    echo.
    echo [ERROR] Ошибка при выполнении обновления (код выхода: %EXIT_CODE%^)
    exit /b %EXIT_CODE%
)

