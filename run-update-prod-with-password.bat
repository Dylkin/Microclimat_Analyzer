@echo off
REM ================================
REM Скрипт для запуска update-prod.sh на удаленном сервере
REM Microclimat Analyzer (с передачей пароля)
REM ================================

setlocal enabledelayedexpansion

REM Параметры подключения
set SSH_HOST=stas@192.168.98.42
set PROJECT_DIR=/home/stas/Microclimat_Analyzer
set SSH_PASSWORD=

REM Можно передать параметры
if not "%1"=="" set SSH_HOST=%1
if not "%2"=="" set PROJECT_DIR=%2
if not "%3"=="" set SSH_PASSWORD=%3

REM Если пароль не передан — запросим у пользователя
if "%SSH_PASSWORD%"=="" (
    set /p SSH_PASSWORD=Enter SSH/sudo password:
)

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

REM Проверка наличия sshpass (через WSL или Git Bash)
where sshpass >nul 2>&1
set USESSHPASS=%ERRORLEVEL%

echo [INFO] Подключение к серверу и запуск update-prod.sh...
echo.

if %USESSHPASS% EQU 0 (
    REM Используем sshpass для передачи пароля
    echo %SSH_PASSWORD% | sshpass -p %SSH_PASSWORD% ssh -o StrictHostKeyChecking=no %SSH_HOST% "cd %PROJECT_DIR% && sudo -S sh ./update-prod.sh /y" <<< %SSH_PASSWORD%
) else (
    REM Используем PowerShell для передачи пароля
    powershell -Command "$password = ConvertTo-SecureString '%SSH_PASSWORD%' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential('%SSH_HOST%', $password); $session = New-SSHSession -ComputerName '%SSH_HOST%' -Credential $credential -AcceptKey; Invoke-SSHCommand -SessionId $session.SessionId -Command 'cd %PROJECT_DIR% && sudo -S sh ./update-prod.sh /y' <<< '%SSH_PASSWORD%'"
    
    REM Если PowerShell не работает, используем обычный SSH (потребует ввода пароля)
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] sshpass не найден, используем обычный SSH
        echo [INFO] Введите пароль при запросе
        echo.
        ssh %SSH_HOST% "cd %PROJECT_DIR% && echo '%SSH_PASSWORD%' | sudo -S sh ./update-prod.sh /y"
    )
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

