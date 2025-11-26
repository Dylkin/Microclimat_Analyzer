@echo off
REM Скрипт для сборки и подготовки файлов для развертывания (Windows)
REM Использование: build-and-deploy.bat

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo   Microclimat Analyzer - Build ^& Deploy
echo ==========================================
echo.

REM Проверка наличия Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не установлен
    exit /b 1
)

REM Проверка наличия npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm не установлен
    exit /b 1
)

echo [OK] Проверка необходимых команд завершена
echo.

REM Установка зависимостей
echo [INFO] Установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ошибка установки зависимостей
    exit /b 1
)
echo [OK] Зависимости установлены
echo.

REM Сборка frontend
echo [INFO] Сборка frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Ошибка сборки frontend
    exit /b 1
)

if not exist "dist" (
    echo [ERROR] Папка dist не создана после сборки
    exit /b 1
)
echo [OK] Frontend собран успешно
echo.

REM Создание папки release
if not exist "release" (
    mkdir release
)

REM Создание архива
echo [INFO] Создание архива для развертывания...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set ARCHIVE_NAME=microclimat_analyzer_%datetime:~0,8%_%datetime:~8,4%.zip
set ARCHIVE_PATH=release\%ARCHIVE_NAME%

REM Проверка наличия PowerShell для создания архива
powershell -Command "Compress-Archive -Path dist\* -DestinationPath %ARCHIVE_PATH% -Force" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Архив создан: %ARCHIVE_PATH%
) else (
    echo [WARN] Не удалось создать архив автоматически
    echo [INFO] Содержимое для развертывания находится в папке dist\
)
echo.

REM Создание файла с информацией о сборке
echo [INFO] Создание файла с информацией о сборке...
set BUILD_INFO=release\BUILD_INFO.txt

(
echo Информация о сборке
echo ===================
echo.
echo Дата сборки: %date% %time%
echo Версия Node.js: 
node --version
echo Версия npm:
npm --version
echo.
echo Содержимое архива:
echo - Frontend ^(dist/^)
echo - Готов к развертыванию на статическом веб-сервере
echo.
echo Инструкции по развертыванию:
echo - См. DEPLOYMENT.md
echo - См. DEPLOYMENT_SERVER_INSTRUCTIONS.md
) > "%BUILD_INFO%"

echo [OK] Файл с информацией создан: %BUILD_INFO%
echo.

echo ==========================================
echo [OK] Сборка завершена успешно!
echo ==========================================
echo.
echo Следующие шаги:
echo 1. Проверьте содержимое папки dist\
if exist "%ARCHIVE_PATH%" (
    echo 2. Архив готов: %ARCHIVE_PATH%
)
echo 3. Следуйте инструкциям в DEPLOYMENT.md для развертывания
echo.

pause


