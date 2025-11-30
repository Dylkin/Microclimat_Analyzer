#!/bin/bash

# Скрипт для удаленного выполнения обновления через SSH
# Использование: ./update-prod-remote.sh [user@host]

SSH_HOST="${1:-stas@192.168.98.42}"
PROJECT_DIR="/home/stas/Microclimat_Analyzer"

echo "Подключение к серверу: $SSH_HOST"
echo "Директория проекта: $PROJECT_DIR"
echo ""

ssh "$SSH_HOST" << 'ENDSSH'
cd /home/stas/Microclimat_Analyzer || exit 1

echo "======================================"
echo "  Обновление Microclimat Analyzer"
echo "======================================"
echo ""

# Обновление кода
echo "[INFO] Обновление кода из Git..."
git pull origin main || exit 1
echo "[SUCCESS] Код обновлен"
echo ""

# Установка зависимостей
echo "[INFO] Установка/обновление зависимостей..."
npm install || exit 1
echo "[SUCCESS] Зависимости установлены"
echo ""

# Обновление БД
echo "[INFO] Обновление структуры базы данных..."
npm run setup-db || echo "[WARNING] Ошибка обновления БД, продолжаем..."
echo ""

# Сборка фронтенда
echo "[INFO] Сборка фронтенда..."
npm run build || exit 1
echo "[SUCCESS] Фронтенд собран"
echo ""

# Перезапуск сервисов
echo "[INFO] Перезапуск сервисов..."
pm2 restart all || echo "[WARNING] PM2 не найден или не запущен"
sudo systemctl restart microclimat-api 2>/dev/null || true
sudo systemctl restart nginx 2>/dev/null || true
echo "[SUCCESS] Сервисы перезапущены"
echo ""

echo "======================================"
echo "[SUCCESS] Обновление завершено!"
echo "======================================"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Обновление успешно выполнено на сервере"
else
    echo ""
    echo "❌ Ошибка при выполнении обновления"
    exit 1
fi

