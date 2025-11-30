@echo off
REM ================================
REM Скрипт создания пакета для развертывания
REM Microclimat Analyzer (Windows)
REM Создает архив с собранным фронтендом и бэкендом
REM ================================

setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set PACKAGE_DIR=%PROJECT_DIR%deployment-packages
set PACKAGE_NAME=microclimat-analyzer-%TIMESTAMP%.zip
set PACKAGE_PATH=%PACKAGE_DIR%\%PACKAGE_NAME%

echo.
echo ======================================
echo   Создание пакета для развертывания
echo   Microclimat Analyzer
echo ======================================
echo.

REM Проверка директории проекта
if not exist "%PROJECT_DIR%package.json" (
    echo [ERROR] Директория проекта не найдена: %PROJECT_DIR%
    exit /b 1
)

echo [INFO] Директория проекта: %PROJECT_DIR%

REM Создание директории для пакетов
if not exist "%PACKAGE_DIR%" mkdir "%PACKAGE_DIR%"
echo [INFO] Директория для пакетов: %PACKAGE_DIR%

REM Проверка наличия собранного фронтенда
if not exist "%PROJECT_DIR%dist" (
    echo [WARNING] Директория dist не найдена. Запускаем сборку фронтенда...
    cd /d "%PROJECT_DIR%"
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Ошибка сборки фронтенда
        exit /b 1
    )
    echo [SUCCESS] Фронтенд собран
) else (
    echo [INFO] Директория dist найдена
)

REM Проверка наличия node_modules
if not exist "%PROJECT_DIR%node_modules" (
    echo [WARNING] node_modules не найдена. Устанавливаем зависимости...
    cd /d "%PROJECT_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Ошибка установки зависимостей
        exit /b 1
    )
    echo [SUCCESS] Зависимости установлены
)

REM Создание временной директории для пакета
set TEMP_DIR=%TEMP%\microclimat-package-%RANDOM%
mkdir "%TEMP_DIR%"
echo [INFO] Временная директория: %TEMP_DIR%

REM Копирование необходимых файлов
echo [INFO] Копирование файлов в пакет...

REM Фронтенд (dist)
if exist "%PROJECT_DIR%dist" (
    xcopy /E /I /Y "%PROJECT_DIR%dist" "%TEMP_DIR%\dist\"
    echo [SUCCESS] Фронтенд (dist) скопирован
)

REM Бэкенд (server)
if exist "%PROJECT_DIR%server" (
    xcopy /E /I /Y "%PROJECT_DIR%server" "%TEMP_DIR%\server\"
    echo [SUCCESS] Бэкенд (server) скопирован
)

REM package.json и package-lock.json
copy /Y "%PROJECT_DIR%package.json" "%TEMP_DIR%\"
if exist "%PROJECT_DIR%package-lock.json" (
    copy /Y "%PROJECT_DIR%package-lock.json" "%TEMP_DIR%\"
)
echo [SUCCESS] package.json скопирован

REM .env.example (если есть)
if exist "%PROJECT_DIR%.env.example" (
    copy /Y "%PROJECT_DIR%.env.example" "%TEMP_DIR%\"
    echo [SUCCESS] .env.example скопирован
)

REM README.md
if exist "%PROJECT_DIR%README.md" (
    copy /Y "%PROJECT_DIR%README.md" "%TEMP_DIR%\"
)

REM Создание файла с информацией о пакете
(
    echo Microclimat Analyzer - Deployment Package
    echo ==========================================
    echo Created: %date% %time%
    echo Package Name: %PACKAGE_NAME%
    echo Project Directory: %PROJECT_DIR%
    echo.
    echo Contents:
    echo - dist/ (Frontend build)
    echo - server/ (Backend source)
    echo - package.json
    echo - package-lock.json (if exists)
    echo.
    echo To deploy:
    echo 1. Transfer this package to production server
    echo 2. Run: deploy-from-package.sh ^<package-name^>
) > "%TEMP_DIR%\PACKAGE_INFO.txt"

echo [SUCCESS] Файл информации о пакете создан

REM Создание архива (используем PowerShell для создания ZIP)
echo [INFO] Создание архива: %PACKAGE_NAME%
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%PACKAGE_PATH%' -Force"
if errorlevel 1 (
    echo [ERROR] Ошибка создания архива
    rmdir /S /Q "%TEMP_DIR%"
    exit /b 1
)

REM Очистка временной директории
rmdir /S /Q "%TEMP_DIR%"

REM Получение размера архива
for %%A in ("%PACKAGE_PATH%") do set SIZE=%%~zA
set /a SIZE_MB=%SIZE% / 1048576
echo [SUCCESS] Архив создан: %PACKAGE_NAME%
echo [INFO] Размер архива: ~%SIZE_MB% MB
echo [INFO] Путь к архиву: %PACKAGE_PATH%

echo.
echo ======================================
echo [SUCCESS] Пакет для развертывания создан!
echo ======================================
echo.
echo [INFO] Для развертывания на продакшене:
echo   1. Скопируйте файл на сервер:
echo      scp %PACKAGE_PATH% stas@192.168.98.42:/home/stas/Microclimat_Analyzer/deployment-packages/
echo.
echo   2. На сервере выполните:
echo      cd /home/stas/Microclimat_Analyzer
echo      bash deploy-from-package.sh %PACKAGE_NAME%
echo.

