@echo off
echo ========================================
echo Исправление политик RLS для qualification-objects
echo ========================================
echo.

echo Выберите вариант исправления:
echo 1. Публичный доступ (быстро, но менее безопасно)
echo 2. Аутентифицированный доступ (безопасно, но требует настройки auth)
echo 3. Отключить RLS временно (самый быстрый способ)
echo.

set /p choice="Введите номер варианта (1-3): "

if "%choice%"=="1" (
    echo.
    echo Применяем политики с публичным доступом...
    echo Выполните этот SQL в Supabase Dashboard:
    echo.
    type fix_qualification_objects_rls.sql
    echo.
    echo ========================================
    echo Скопируйте SQL выше и выполните в Supabase Dashboard
    echo ========================================
) else if "%choice%"=="2" (
    echo.
    echo Применяем политики с аутентификацией...
    echo Выполните этот SQL в Supabase Dashboard:
    echo.
    type fix_qualification_objects_rls_authenticated.sql
    echo.
    echo ========================================
    echo Скопируйте SQL выше и выполните в Supabase Dashboard
    echo ========================================
) else if "%choice%"=="3" (
    echo.
    echo Временно отключаем RLS для qualification-objects...
    echo Выполните этот SQL в Supabase Dashboard:
    echo.
    echo -- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS
    echo ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
    echo.
    echo -- ВНИМАНИЕ: Это отключает RLS для ВСЕХ bucket'ов!
    echo -- После тестирования включите обратно:
    echo -- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    echo.
    echo ========================================
    echo ВНИМАНИЕ: Это отключает RLS для всех bucket'ов!
    echo ========================================
) else (
    echo Неверный выбор. Запустите скрипт снова.
)

echo.
echo После применения SQL скрипта:
echo 1. Перезагрузите страницу в браузере
echo 2. Попробуйте загрузить файл плана объекта снова
echo.
pause