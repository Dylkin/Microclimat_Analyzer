@echo off
REM Скрипт для создания архива для развертывания (Windows)
REM Использование: create-deployment-archive.bat

setlocal enabledelayedexpansion

set "ARCHIVE_NAME=microclimat-analyzer-deployment-%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%.zip"
set "TEMP_DIR=deployment-temp"
set "PROJECT_NAME=Microclimat_Analyzer"

echo 📦 Создание архива для развертывания...

REM Создание временной директории
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%\%PROJECT_NAME%"

echo 📋 Копирование файлов...

REM Копирование основных файлов конфигурации
copy package.json "%TEMP_DIR%\%PROJECT_NAME%\" >nul
copy package-lock.json "%TEMP_DIR%\%PROJECT_NAME%\" >nul
copy tsconfig.json "%TEMP_DIR%\%PROJECT_NAME%\" >nul
if exist tsconfig.node.json copy tsconfig.node.json "%TEMP_DIR%\%PROJECT_NAME%\" >nul
if exist tsconfig.server.json copy tsconfig.server.json "%TEMP_DIR%\%PROJECT_NAME%\" >nul
copy vite.config.ts "%TEMP_DIR%\%PROJECT_NAME%\" >nul
copy postcss.config.js "%TEMP_DIR%\%PROJECT_NAME%\" >nul 2>&1
copy index.html "%TEMP_DIR%\%PROJECT_NAME%\" >nul
if exist tailwind.config.js copy tailwind.config.js "%TEMP_DIR%\%PROJECT_NAME%\" >nul

REM Копирование исходного кода
echo 📁 Копирование исходного кода...
xcopy /E /I /Y src "%TEMP_DIR%\%PROJECT_NAME%\src" >nul
xcopy /E /I /Y server "%TEMP_DIR%\%PROJECT_NAME%\server" >nul

REM Копирование миграций
echo 🗄️ Копирование миграций базы данных...
if exist supabase\migrations (
    mkdir "%TEMP_DIR%\%PROJECT_NAME%\supabase\migrations" >nul 2>&1
    xcopy /E /I /Y supabase\migrations "%TEMP_DIR%\%PROJECT_NAME%\supabase\migrations" >nul
)

REM Копирование публичных файлов
if exist public (
    xcopy /E /I /Y public "%TEMP_DIR%\%PROJECT_NAME%\public" >nul
)

REM Создание файла .env.example
echo ⚙️ Создание .env.example...
(
echo # База данных PostgreSQL
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=microclimat
echo DB_USER=microclimat_user
echo DB_PASSWORD=your_secure_password_here
echo.
echo # Сервер
echo PORT=3001
echo NODE_ENV=production
echo.
echo # CORS ^(если frontend на другом домене^)
echo CORS_ORIGIN=https://your-domain.com
echo # или для локального тестирования
echo # CORS_ORIGIN=http://localhost:5173
) > "%TEMP_DIR%\%PROJECT_NAME%\.env.example"

REM Копирование инструкции по развертыванию
copy DEPLOYMENT_INSTRUCTIONS.md "%TEMP_DIR%\%PROJECT_NAME%\" >nul

REM Создание README для архива
(
echo # Microclimat Analyzer - Архив для развертывания
echo.
echo Этот архив содержит все необходимые файлы для развертывания приложения на сервере.
echo.
echo ## Содержимое архива
echo.
echo - `src/` - Исходный код frontend ^(React^)
echo - `server/` - Исходный код backend ^(Node.js + Express^)
echo - `supabase/migrations/` - Миграции базы данных PostgreSQL
echo - `package.json` - Зависимости проекта
echo - `.env.example` - Пример файла конфигурации
echo.
echo ## Быстрый старт
echo.
echo 1. Распакуйте архив на сервере
echo 2. Следуйте инструкциям в файле `DEPLOYMENT_INSTRUCTIONS.md`
echo.
echo ## Важные замечания
echo.
echo - **НЕ** включайте файл `.env` в архив ^(он содержит секретные данные^)
echo - Создайте файл `.env` на основе `.env.example` после распаковки
echo - Убедитесь, что на сервере установлены Node.js 18+ и PostgreSQL 13+
echo.
echo ## Поддержка
echo.
echo При возникновении проблем обратитесь к разделу "Решение проблем" в `DEPLOYMENT_INSTRUCTIONS.md`
) > "%TEMP_DIR%\%PROJECT_NAME%\README.md"

REM Создание .gitignore для архива
(
echo # Зависимости
echo node_modules/
echo package-lock.json
echo.
echo # Сборка
echo dist/
echo build/
echo.
echo # Переменные окружения
echo .env
echo .env.local
echo .env.*.local
echo.
echo # Логи
echo *.log
echo npm-debug.log*
echo yarn-debug.log*
echo yarn-error.log*
echo.
echo # Временные файлы
echo *.tmp
echo *.temp
echo .DS_Store
echo Thumbs.db
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo.
echo # Загруженные файлы
echo uploads/
echo !uploads/.gitkeep
) > "%TEMP_DIR%\%PROJECT_NAME%\.gitignore"

REM Создание архива с помощью PowerShell
echo 🗜️ Создание архива...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\%PROJECT_NAME%\*' -DestinationPath '%ARCHIVE_NAME%' -Force"

REM Очистка
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ Архив создан: %ARCHIVE_NAME%
echo.
echo 📝 Следующие шаги:
echo    1. Передайте архив на сервер
echo    2. Распакуйте архив
echo    3. Следуйте инструкциям в DEPLOYMENT_INSTRUCTIONS.md
echo.

pause

