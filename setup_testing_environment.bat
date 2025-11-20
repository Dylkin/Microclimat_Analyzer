@echo off
echo ========================================
echo Настройка тестовой среды для проекта
echo ========================================
echo.
echo Устанавливаем зависимости для тестирования...
echo.

echo 1. Установка Jest и окружения...
npm install --save-dev jest jest-environment-jsdom @types/jest ts-jest

echo.
echo 2. Установка React Testing Library...
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

echo.
echo 3. Установка дополнительных утилит...
npm install --save-dev identity-obj-proxy

echo.
echo 4. Копирование конфигурационных файлов...
if not exist "jest.config.js" (
    echo Создание jest.config.js...
    copy "jest.config.js" "jest.config.js"
) else (
    echo jest.config.js уже существует
)

if not exist "src\setupTests.ts" (
    echo Создание setupTests.ts...
    copy "src\setupTests.ts" "src\setupTests.ts"
) else (
    echo setupTests.ts уже существует
)

if not exist "src\__mocks__" mkdir "src\__mocks__"
if not exist "src\__mocks__\fileMock.js" (
    echo Создание fileMock.js...
    copy "src\__mocks__\fileMock.js" "src\__mocks__\fileMock.js"
) else (
    echo fileMock.js уже существует
)

echo.
echo 5. Обновление package.json...
if exist "package-test.json" (
    echo Обновление package.json с тестовыми скриптами...
    copy "package-test.json" "package.json"
) else (
    echo package-test.json не найден, пропускаем обновление
)

echo.
echo 6. Создание директорий для тестов...
if not exist "src\components\contract\__tests__" mkdir "src\components\contract\__tests__"
if not exist "src\utils\__tests__" mkdir "src\utils\__tests__"

echo.
echo ========================================
echo Настройка завершена!
echo ========================================
echo.
echo Доступные команды:
echo - npm test                    - запуск всех тестов
echo - npm run test:watch          - запуск тестов в режиме наблюдения
echo - npm run test:coverage       - запуск тестов с отчетом о покрытии
echo - run_contract_tests.bat      - запуск тестов для страницы согласования
echo.
echo Тестовые файлы созданы в:
echo - src\components\contract\__tests__\
echo - src\utils\__tests__\
echo.
pause























