@echo off
echo ========================================
echo Запуск автотестов для страницы "Согласование договора"
echo ========================================
echo.
echo Тестируемые компоненты:
echo - ContractNegotiation (основная страница)
echo - DocumentApproval (согласование документов)
echo - DocumentComments (комментарии)
echo - DocumentApprovalActions (действия согласования)
echo - QualificationObjectsCRUD (объекты квалификации)
echo - DocumentUpload (загрузка документов)
echo - DocumentApprovalService (сервис)
echo.
echo Типы тестов:
echo - Unit тесты компонентов
echo - Integration тесты
echo - Service тесты
echo - Error handling тесты
echo.
echo Установка зависимостей для тестирования...
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest ts-jest

echo.
echo Запуск тестов...
npm test -- --testPathPattern="contract" --verbose

echo.
echo Генерация отчета о покрытии...
npm test -- --testPathPattern="contract" --coverage --coverageReporters=text-lcov > coverage.lcov

echo.
echo Тесты завершены!
echo Результаты сохранены в coverage.lcov
pause























