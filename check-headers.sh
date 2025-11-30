#!/bin/bash
# ================================
# Скрипт для проверки передачи заголовков через Nginx
# Microclimat Analyzer
# ================================

echo "Проверка передачи заголовков через Nginx"
echo "=========================================="
echo ""

# Проверка логов backend
echo "1. Проверка логов backend (последние 20 строк с ошибками авторизации):"
echo "---"
sudo journalctl -u microclimat-api -n 50 --no-pager | grep -i "авторизац\|authorization\|x-user-id" | tail -20 || echo "Логи не найдены (возможно, используется PM2)"
echo ""

# Проверка логов PM2
echo "2. Проверка логов PM2 (последние 50 строк):"
echo "---"
pm2 logs microclimat-api --lines 50 --nostream | grep -i "авторизац\|authorization\|x-user-id\|userId" | tail -20 || echo "PM2 не найден или процесс не запущен"
echo ""

# Проверка конфигурации Nginx
echo "3. Проверка конфигурации Nginx:"
echo "---"
if [ -f /etc/nginx/sites-available/microclimat-analyzer ]; then
    echo "Конфигурация найдена: /etc/nginx/sites-available/microclimat-analyzer"
    echo ""
    echo "Блок location /api:"
    grep -A 15 "location /api" /etc/nginx/sites-available/microclimat-analyzer | head -20
    echo ""
    if grep -q "X-User-Id\|x-user-id" /etc/nginx/sites-available/microclimat-analyzer; then
        echo "✅ Заголовок X-User-Id найден в конфигурации"
    else
        echo "❌ Заголовок X-User-Id НЕ найден в конфигурации!"
    fi
else
    echo "Конфигурационный файл не найден"
fi
echo ""

# Тестовый запрос
echo "4. Тестовый запрос к API с заголовком:"
echo "---"
echo "Выполните вручную:"
echo "curl -H 'x-user-id: test-user-id' http://localhost:3001/api/projects?userId=test-user-id"
echo ""

echo "5. Проверка доступности backend:"
echo "---"
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend доступен на localhost:3001"
else
    echo "❌ Backend НЕ доступен на localhost:3001"
fi
echo ""

echo "=========================================="
echo "Проверка завершена"

