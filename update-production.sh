#!/bin/bash

# Скрипт обновления Microclimat Analyzer на продакшене
# Использование: ./update-production.sh

set -e  # Остановка при ошибке

echo "🚀 Начало обновления Microclimat Analyzer..."

# Определяем директорию проекта (можно изменить)
PROJECT_DIR="${PROJECT_DIR:-/home/stas/Microclimat_Analyzer}"
PROJECT_USER="${PROJECT_USER:-stas}"

# Переходим в директорию проекта
cd "$PROJECT_DIR" || {
    echo "❌ Ошибка: Директория $PROJECT_DIR не найдена"
    exit 1
}

echo "📂 Директория проекта: $PROJECT_DIR"

# Обновляем код из GitHub
echo "📥 Обновление кода из GitHub..."
sudo -u "$PROJECT_USER" git pull origin main

# Устанавливаем зависимости (если package.json изменился)
echo "📦 Проверка зависимостей..."
if sudo -u "$PROJECT_USER" git diff HEAD@{1} HEAD --name-only | grep -q "package.json\|package-lock.json"; then
    echo "📦 Обнаружены изменения в package.json, устанавливаем зависимости..."
    sudo -u "$PROJECT_USER" npm install
else
    echo "✅ Зависимости не изменились, пропускаем npm install"
fi

# Применяем миграции БД (если нужно)
echo "🗄️  Проверка миграций базы данных..."
if sudo -u "$PROJECT_USER" git diff HEAD@{1} HEAD --name-only | grep -q "\.sql\|server/scripts"; then
    echo "🗄️  Обнаружены изменения в миграциях, применяем..."
    sudo -u "$PROJECT_USER" npm run setup-db || echo "⚠️  Предупреждение: Ошибка при применении миграций"
else
    echo "✅ Миграции не изменились, пропускаем"
fi

# Пересобираем проект
echo "🔨 Сборка проекта..."
sudo -u "$PROJECT_USER" npm run build

# Перезапускаем PM2
echo "🔄 Перезапуск PM2 процессов..."
sudo -u "$PROJECT_USER" pm2 restart all

# Перезагружаем Nginx
echo "🔄 Перезагрузка Nginx..."
sudo systemctl reload nginx

# Проверяем статус
echo "✅ Проверка статуса сервисов..."
echo ""
echo "📊 Статус PM2:"
sudo -u "$PROJECT_USER" pm2 status

echo ""
echo "📊 Статус Nginx:"
systemctl is-active nginx && echo "✅ Nginx работает" || echo "❌ Nginx не работает"

echo ""
echo "🎉 Обновление завершено!"
echo ""
echo "🔍 Для проверки логов используйте:"
echo "   sudo -u $PROJECT_USER pm2 logs"
echo "   tail -f /var/log/nginx/microclimat-error.log"

