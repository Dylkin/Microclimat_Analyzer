@echo off
REM ================================
REM Скрипт для запуска update-prod.sh на удаленном сервере
REM Microclimat Analyzer
REM ================================

setlocal enabledelayedexpansion

REM Параметры подключения
set SSH_HOST=stas@192.168.98.42
set PROJECT_DIR=/home/stas/Microclimat_Analyzer

REM Можно передать хост как параметр
if not "%1"=="" set SSH_HOST=%1
if not "%2"=="" set PROJECT_DIR=%2

echo.
echo ========================================
echo   Запуск обновления на продакшене
echo ========================================
echo.
echo [INFO] Сервер: %SSH_HOST%
echo [INFO] Директория: %PROJECT_DIR%
echo.

REM Проверка наличия SSH
where ssh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] SSH не найден!
    echo [INFO] Установите OpenSSH Client:
    echo        Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    echo.
    pause
    exit /b 1
)

echo [INFO] Подключение к серверу и запуск update-prod.sh...
echo.

REM Подключаемся к серверу и запускаем скрипт обновления
REM Пытаемся установить права, но игнорируем ошибку если не получилось
REM Запускаем через bash, если chmod не сработал
ssh %SSH_HOST% "cd %PROJECT_DIR% && (chmod +x update-prod.sh 2>/dev/null || true) && (bash update-prod.sh || ./update-prod.sh)"

set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% EQU 0 (
    echo ========================================
    echo [SUCCESS] Обновление завершено успешно!
    echo ========================================
) else (
    echo ========================================
    echo [ERROR] Ошибка при выполнении обновления
    echo Код выхода: %EXIT_CODE%
    echo ========================================
)

echo.
pause
exit /b %EXIT_CODE%

