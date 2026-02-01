@echo off
echo ========================================
echo БЫСТРОЕ ИСПРАВЛЕНИЕ RLS для qualification-objects
echo ========================================
echo.

echo Проблема: new row violates row-level security policy
echo Решение: Временно отключить RLS для storage.objects
echo.

echo ВНИМАНИЕ: Это отключит RLS для ВСЕХ bucket'ов в storage!
echo Это временное решение для тестирования.
echo.

set /p confirm="Продолжить? (y/n): "

if /i "%confirm%"=="y" (
    echo.
    echo ========================================
    echo SQL КОМАНДЫ ДЛЯ SUPABASE DASHBOARD:
    echo ========================================
    echo.
    echo ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
    echo.
    echo ========================================
    echo ИНСТРУКЦИИ:
    echo ========================================
    echo 1. Откройте Supabase Dashboard
    echo 2. Перейдите в SQL Editor
    echo 3. Выполните команду выше
    echo 4. Перезагрузите страницу в браузере
    echo 5. Попробуйте загрузить файл плана объекта
    echo.
    echo ========================================
    echo ВОССТАНОВЛЕНИЕ RLS (после тестирования):
    echo ========================================
    echo.
    echo ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    echo.
    echo Затем создайте правильные политики RLS для qualification-objects
    echo.
) else (
    echo Отменено.
)

echo.
pause























