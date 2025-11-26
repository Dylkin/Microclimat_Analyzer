#!/bin/bash

# Скрипт для создания архива для развертывания
# Использование: ./create-deployment-archive.sh

set -e

ARCHIVE_NAME="microclimat-analyzer-deployment-$(date +%Y%m%d-%H%M%S).tar.gz"
TEMP_DIR="deployment-temp"
PROJECT_NAME="Microclimat_Analyzer"

echo "📦 Создание архива для развертывания..."

# Создание временной директории
mkdir -p "$TEMP_DIR/$PROJECT_NAME"

echo "📋 Копирование файлов..."

# Копирование основных файлов конфигурации
cp package.json "$TEMP_DIR/$PROJECT_NAME/"
cp package-lock.json "$TEMP_DIR/$PROJECT_NAME/"
cp tsconfig.json "$TEMP_DIR/$PROJECT_NAME/"
cp tsconfig.node.json "$TEMP_DIR/$PROJECT_NAME/" 2>/dev/null || true
cp tsconfig.server.json "$TEMP_DIR/$PROJECT_NAME/" 2>/dev/null || true
cp vite.config.ts "$TEMP_DIR/$PROJECT_NAME/"
cp postcss.config.js "$TEMP_DIR/$PROJECT_NAME/"
cp index.html "$TEMP_DIR/$PROJECT_NAME/"
cp tailwind.config.js "$TEMP_DIR/$PROJECT_NAME/" 2>/dev/null || true

# Копирование исходного кода
echo "📁 Копирование исходного кода..."
cp -r src "$TEMP_DIR/$PROJECT_NAME/"
cp -r server "$TEMP_DIR/$PROJECT_NAME/"

# Копирование миграций
echo "🗄️ Копирование миграций базы данных..."
mkdir -p "$TEMP_DIR/$PROJECT_NAME/supabase/migrations"
cp -r supabase/migrations/* "$TEMP_DIR/$PROJECT_NAME/supabase/migrations/" 2>/dev/null || true

# Копирование публичных файлов
if [ -d "public" ]; then
    cp -r public "$TEMP_DIR/$PROJECT_NAME/"
fi

# Создание файла .env.example
echo "⚙️ Создание .env.example..."
cat > "$TEMP_DIR/$PROJECT_NAME/.env.example" << 'EOF'
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microclimat
DB_USER=microclimat_user
DB_PASSWORD=your_secure_password_here

# Сервер
PORT=3001
NODE_ENV=production

# CORS (если frontend на другом домене)
CORS_ORIGIN=https://your-domain.com
# или для локального тестирования
# CORS_ORIGIN=http://localhost:5173
EOF

# Копирование инструкции по развертыванию
cp DEPLOYMENT_INSTRUCTIONS.md "$TEMP_DIR/$PROJECT_NAME/"

# Создание README для архива
cat > "$TEMP_DIR/$PROJECT_NAME/README.md" << 'EOF'
# Microclimat Analyzer - Архив для развертывания

Этот архив содержит все необходимые файлы для развертывания приложения на сервере.

## Содержимое архива

- `src/` - Исходный код frontend (React)
- `server/` - Исходный код backend (Node.js + Express)
- `supabase/migrations/` - Миграции базы данных PostgreSQL
- `package.json` - Зависимости проекта
- `.env.example` - Пример файла конфигурации

## Быстрый старт

1. Распакуйте архив на сервере
2. Следуйте инструкциям в файле `DEPLOYMENT_INSTRUCTIONS.md`

## Важные замечания

- **НЕ** включайте файл `.env` в архив (он содержит секретные данные)
- Создайте файл `.env` на основе `.env.example` после распаковки
- Убедитесь, что на сервере установлены Node.js 18+ и PostgreSQL 13+

## Поддержка

При возникновении проблем обратитесь к разделу "Решение проблем" в `DEPLOYMENT_INSTRUCTIONS.md`
EOF

# Создание .gitignore для архива
cat > "$TEMP_DIR/$PROJECT_NAME/.gitignore" << 'EOF'
# Зависимости
node_modules/
package-lock.json

# Сборка
dist/
build/

# Переменные окружения
.env
.env.local
.env.*.local

# Логи
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Временные файлы
*.tmp
*.temp
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Загруженные файлы
uploads/
!uploads/.gitkeep
EOF

# Создание архива
echo "🗜️ Создание архива..."
cd "$TEMP_DIR"
tar -czf "../$ARCHIVE_NAME" "$PROJECT_NAME"
cd ..

# Очистка
rm -rf "$TEMP_DIR"

echo "✅ Архив создан: $ARCHIVE_NAME"
echo "📊 Размер архива: $(du -h "$ARCHIVE_NAME" | cut -f1)"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Передайте архив на сервер"
echo "   2. Распакуйте архив"
echo "   3. Следуйте инструкциям в DEPLOYMENT_INSTRUCTIONS.md"

