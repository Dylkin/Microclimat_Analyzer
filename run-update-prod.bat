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
set SSH_PASSWORD=
set SSH_USER=stas
set SSH_HOST_ONLY=192.168.98.42

REM Если пароль не передан — запросим у пользователя
if "%3"=="" (
    set /p SSH_PASSWORD=Enter SSH/sudo password:
) else (
    set SSH_PASSWORD=%3
)

REM Используем plink с автоматическим принятием ключа хоста
REM Для plink нужно указать fingerprint ключа хоста
REM Из предыдущего вывода: ssh-ed25519 255 SHA256:zKyaX+SZi84RtPZeVyWau+IAqNlQFss2pkLf/xuETDg
where plink >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Используем plink для автоматической передачи пароля...
    plink -ssh -pw %SSH_PASSWORD% -hostkey "ssh-ed25519 255 SHA256:zKyaX+SZi84RtPZeVyWau+IAqNlQFss2pkLf/xuETDg" %SSH_USER%@%SSH_HOST_ONLY% "cd %PROJECT_DIR% && echo %SSH_PASSWORD% | sudo -S bash update-prod.sh"
) else (
    REM Используем обычный SSH (потребует ввода пароля вручную)
    echo [INFO] plink не найден, используем обычный SSH
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL %SSH_HOST% "cd %PROJECT_DIR% && echo '%SSH_PASSWORD%' | sudo -S bash update-prod.sh"
)

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

