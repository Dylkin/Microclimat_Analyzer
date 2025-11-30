@echo off
REM ================================
REM Скрипт для автоматического запуска update-prod.sh на удаленном сервере
REM Microclimat Analyzer (с автоматической передачей пароля)
REM ================================

setlocal enabledelayedexpansion

REM Параметры подключения
set SSH_HOST=stas@192.168.98.42
set PROJECT_DIR=/home/stas/Microclimat_Analyzer
set SSH_PASSWORD=159357Stas

REM Можно передать параметры
if not "%1"=="" set SSH_HOST=%1
if not "%2"=="" set PROJECT_DIR=%2
if not "%3"=="" set SSH_PASSWORD=%3

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

REM Создаем временный скрипт для передачи пароля
set TEMP_SCRIPT=%TEMP%\ssh-pass-script.sh
(
    echo #!/bin/bash
    echo cd %PROJECT_DIR%
    echo echo %SSH_PASSWORD% ^| sudo -S sh ./update-prod.sh
) > "%TEMP_SCRIPT%"

REM Используем PowerShell для автоматической передачи пароля через SSH
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$ErrorActionPreference = 'Stop'; " ^
"$password = ConvertTo-SecureString '%SSH_PASSWORD%' -AsPlainText -Force; " ^
"$username = '%SSH_HOST%' -replace '@.*', ''; " ^
"$hostname = '%SSH_HOST%' -replace '.*@', ''; " ^
"$credential = New-Object System.Management.Automation.PSCredential($username, $password); " ^
"$session = New-SSHSession -ComputerName $hostname -Credential $credential -AcceptKey -ErrorAction SilentlyContinue; " ^
"if ($session) { " ^
"    Invoke-SSHCommand -SessionId $session.SessionId -Command 'cd %PROJECT_DIR% && echo %SSH_PASSWORD% | sudo -S sh ./update-prod.sh'; " ^
"    Remove-SSHSession -SessionId $session.SessionId; " ^
"} else { " ^
"    Write-Host 'Используем обычный SSH (требует ввода пароля)'; " ^
"    $process = Start-Process -FilePath 'ssh' -ArgumentList '%SSH_HOST%', 'cd %PROJECT_DIR% && echo %SSH_PASSWORD% | sudo -S sh ./update-prod.sh' -NoNewWindow -Wait -PassThru; " ^
"    exit $process.ExitCode; " ^
"}"

set EXIT_CODE=%ERRORLEVEL%

REM Удаляем временный файл
del "%TEMP_SCRIPT%" >nul 2>&1

REM Если PowerShell не сработал, пробуем через WSL или обычный SSH
if %EXIT_CODE% NEQ 0 (
    echo [INFO] Пробуем альтернативный метод...
    
    REM Проверяем наличие WSL
    where wsl >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        REM Используем WSL с sshpass
        wsl bash -c "echo '%SSH_PASSWORD%' | sshpass -p '%SSH_PASSWORD%' ssh -o StrictHostKeyChecking=no %SSH_HOST% 'cd %PROJECT_DIR% && echo %SSH_PASSWORD% | sudo -S sh ./update-prod.sh'"
        set EXIT_CODE=%ERRORLEVEL%
    ) else (
        REM Используем обычный SSH (потребует ввода пароля вручную)
        echo [WARNING] Автоматическая передача пароля не доступна
        echo [INFO] Введите пароль при запросе: %SSH_PASSWORD%
        echo.
        ssh %SSH_HOST% "cd %PROJECT_DIR% && echo '%SSH_PASSWORD%' | sudo -S sh ./update-prod.sh"
        set EXIT_CODE=%ERRORLEVEL%
    )
)

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

