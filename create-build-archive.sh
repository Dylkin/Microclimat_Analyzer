#!/bin/bash

# ================================
# Скрипт создания архива для обновления продакшена
# Microclimat Analyzer
# Создает архив с собранным проектом из Dev окружения
# ================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

print_warning() {
    printf "${YELLOW}[WARNING]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

# Определение пути к проекту
PROJECT_DIR="${1:-$(pwd)}"

if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

print_info "Директория проекта: $PROJECT_DIR"

# Проверка package.json
if [ ! -f "package.json" ]; then
    print_error "package.json не найден. Убедитесь, что вы в корне проекта."
    exit 1
fi

# Сборка фронтенда
print_info "Сборка фронтенда..."
if command -v npm &> /dev/null; then
    npm run build || {
        print_error "Ошибка сборки фронтенда"
        exit 1
    }
    print_success "Фронтенд собран"
else
    print_error "npm не найден"
    exit 1
fi

# Проверка наличия dist
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    print_error "Директория dist не найдена или пуста после сборки"
    exit 1
fi

# Создание архива
OUTPUT_DIR="${2:-$(pwd)}"
ARCHIVE_NAME="microclimat-build-$(date +%Y%m%d_%H%M%S).tar.gz"
ARCHIVE_PATH="$OUTPUT_DIR/$ARCHIVE_NAME"

print_info "Создание архива: $ARCHIVE_PATH"

# Создаем временную директорию для архива
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Копируем необходимые файлы
print_info "Копирование файлов в архив..."

# Копируем основные файлы и папки
cp -r package.json package-lock.json "$TEMP_DIR/" 2>/dev/null || true
cp -r server "$TEMP_DIR/" 2>/dev/null || true
cp -r src "$TEMP_DIR/" 2>/dev/null || true
cp -r dist "$TEMP_DIR/" 2>/dev/null || true
cp -r database_setup.sql "$TEMP_DIR/" 2>/dev/null || true
cp -r supabase "$TEMP_DIR/" 2>/dev/null || true

# Копируем конфигурационные файлы
for file in tsconfig.json vite.config.ts .env.example; do
    if [ -f "$file" ]; then
        cp "$file" "$TEMP_DIR/" 2>/dev/null || true
    fi
done

# Создаем архив
cd "$TEMP_DIR"
tar -czf "$ARCHIVE_PATH" . || {
    print_error "Ошибка создания архива"
    exit 1
}

print_success "Архив создан: $ARCHIVE_PATH"
print_info "Размер архива: $(du -h "$ARCHIVE_PATH" | cut -f1)"

echo ""
print_info "Для обновления продакшена используйте:"
print_info "  ./update-prod-from-archive.sh $ARCHIVE_PATH [директория_проекта]"

