@echo off
echo ========================================
echo ИСПРАВЛЕНИЕ ХРАНЕНИЯ ЗОН ИЗМЕРЕНИЯ
echo ========================================
echo.

echo Проблема: Зоны измерения не сохраняются
echo Причина: Возможно отсутствует поле measurement_zones в таблице qualification_objects
echo.

echo ========================================
echo РЕШЕНИЕ:
echo ========================================
echo.

echo 1. Проверьте структуру таблицы qualification_objects:
echo.
type check_measurement_zones_field.sql
echo.

echo ========================================
echo 2. Если поле measurement_zones отсутствует, выполните:
echo ========================================
echo.
type create_measurement_zones_field.sql
echo.

echo ========================================
echo ИНСТРУКЦИИ:
echo ========================================
echo.
echo 1. Откройте Supabase Dashboard
echo 2. Перейдите в SQL Editor
echo 3. Выполните первый скрипт для проверки
echo 4. Если поле measurement_zones отсутствует, выполните второй скрипт
echo 5. Перезагрузите страницу в браузере
echo 6. Попробуйте сохранить зоны измерения снова
echo.

echo ========================================
echo СТРУКТУРА ДАННЫХ:
echo ========================================
echo.
echo Поле measurement_zones должно содержать JSON в формате:
echo [
echo   {
echo     "id": "zone-123",
echo     "zoneNumber": 1,
echo     "measurementLevels": [
echo       {
echo         "id": "level-456",
echo         "level": 1.5,
echo         "equipmentId": "eq-789",
echo         "equipmentName": "Логгер-1"
echo       }
echo     ]
echo   }
echo ]
echo.

pause























