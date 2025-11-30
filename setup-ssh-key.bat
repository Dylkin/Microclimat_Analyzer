@echo off
REM ================================
REM Настройка SSH ключа для автоматической аутентификации
REM Microclimat Analyzer
REM ================================

setlocal enabledelayedexpansion

set SSH_HOST=stas@192.168.98.42
set SSH_PASSWORD=159357Stas

echo.
echo ========================================
echo   Настройка SSH ключа
echo ========================================
echo.
echo [INFO] Это создаст SSH ключ для автоматической аутентификации
echo [INFO] Сервер: %SSH_HOST%
echo.
echo [INFO] При запросе пароля SSH введите: %SSH_PASSWORD%
echo [INFO] При запросе пароля для sudo на сервере введите: %SSH_PASSWORD%
echo.

REM Проверяем наличие SSH ключа
if exist "%USERPROFILE%\.ssh\id_rsa" (
    echo [INFO] SSH ключ уже существует
) else (
    echo [INFO] Создание SSH ключа...
    ssh-keygen -t rsa -b 4096 -f "%USERPROFILE%\.ssh\id_rsa" -N ""
)

echo.
echo [INFO] Копирование ключа на сервер...
echo [INFO] При запросе пароля SSH введите: %SSH_PASSWORD%
echo.

REM Копируем ключ на сервер
type "%USERPROFILE%\.ssh\id_rsa.pub" | ssh %SSH_HOST% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo [SUCCESS] SSH ключ настроен успешно!
    echo ========================================
    echo.
    echo [INFO] Теперь можно использовать run-update-prod.bat без ввода пароля
    echo.
) else (
    echo.
    echo ========================================
    echo [ERROR] Ошибка настройки SSH ключа
    echo ========================================
    echo.
)

pause

