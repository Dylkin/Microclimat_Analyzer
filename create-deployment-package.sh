#!/bin/bash
# ================================
# Скрипт создания пакета для развертывания
# Microclimat Analyzer
# Создает архив с собранным фронтендом и бэкендом
# ================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Директория проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$PROJECT_DIR/deployment-packages"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="microclimat-analyzer-${TIMESTAMP}.tar.gz"
PACKAGE_PATH="$PACKAGE_DIR/$PACKAGE_NAME"

echo ""
echo "======================================"
echo "  Создание пакета для развертывания"
echo "  Microclimat Analyzer"
echo "======================================"
echo ""

# Проверка директории проекта
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

print_info "Директория проекта: $PROJECT_DIR"

# Создание директории для пакетов
mkdir -p "$PACKAGE_DIR"
print_info "Директория для пакетов: $PACKAGE_DIR"

# Проверка наличия собранного фронтенда
if [ ! -d "$PROJECT_DIR/dist" ]; then
    print_warning "Директория dist не найдена. Запускаем сборку фронтенда..."
    cd "$PROJECT_DIR"
    npm run build
    if [ $? -ne 0 ]; then
        print_error "Ошибка сборки фронтенда"
        exit 1
    fi
    print_success "Фронтенд собран"
else
    print_info "Директория dist найдена"
fi

# Проверка наличия node_modules
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    print_warning "node_modules не найдена. Устанавливаем зависимости..."
    cd "$PROJECT_DIR"
    npm install
    if [ $? -ne 0 ]; then
        print_error "Ошибка установки зависимостей"
        exit 1
    fi
    print_success "Зависимости установлены"
fi

# Создание временной директории для пакета
TEMP_DIR=$(mktemp -d)
print_info "Временная директория: $TEMP_DIR"

# Копирование необходимых файлов
print_info "Копирование файлов в пакет..."

# Фронтенд (dist)
if [ -d "$PROJECT_DIR/dist" ]; then
    cp -r "$PROJECT_DIR/dist" "$TEMP_DIR/"
    print_success "Фронтенд (dist) скопирован"
fi

# Бэкенд (server)
if [ -d "$PROJECT_DIR/server" ]; then
    cp -r "$PROJECT_DIR/server" "$TEMP_DIR/"
    print_success "Бэкенд (server) скопирован"
fi

# package.json и package-lock.json
cp "$PROJECT_DIR/package.json" "$TEMP_DIR/"
if [ -f "$PROJECT_DIR/package-lock.json" ]; then
    cp "$PROJECT_DIR/package-lock.json" "$TEMP_DIR/"
fi
print_success "package.json скопирован"

# .env.example (если есть)
if [ -f "$PROJECT_DIR/.env.example" ]; then
    cp "$PROJECT_DIR/.env.example" "$TEMP_DIR/"
    print_success ".env.example скопирован"
fi

# README.md и другие важные файлы
if [ -f "$PROJECT_DIR/README.md" ]; then
    cp "$PROJECT_DIR/README.md" "$TEMP_DIR/"
fi

# Создание файла с информацией о пакете
cat > "$TEMP_DIR/PACKAGE_INFO.txt" << EOF
Microclimat Analyzer - Deployment Package
==========================================
Created: $(date)
Package Name: $PACKAGE_NAME
Project Directory: $PROJECT_DIR

Contents:
- dist/ (Frontend build)
- server/ (Backend source)
- package.json
- package-lock.json (if exists)

To deploy:
1. Transfer this package to production server
2. Run: deploy-from-package.sh <package-name>
EOF

print_success "Файл информации о пакете создан"

# Создание архива
print_info "Создание архива: $PACKAGE_NAME"
cd "$TEMP_DIR"
tar -czf "$PACKAGE_PATH" .
if [ $? -ne 0 ]; then
    print_error "Ошибка создания архива"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Очистка временной директории
rm -rf "$TEMP_DIR"

# Получение размера архива
PACKAGE_SIZE=$(du -h "$PACKAGE_PATH" | cut -f1)
print_success "Архив создан: $PACKAGE_NAME"
print_info "Размер архива: $PACKAGE_SIZE"
print_info "Путь к архиву: $PACKAGE_PATH"

echo ""
echo "======================================"
print_success "Пакет для развертывания создан!"
echo "======================================"
echo ""
print_info "Для развертывания на продакшене:"
echo "  1. Скопируйте файл на сервер:"
echo "     scp $PACKAGE_PATH stas@192.168.98.42:/home/stas/Microclimat_Analyzer/deployment-packages/"
echo ""
echo "  2. На сервере выполните:"
echo "     cd /home/stas/Microclimat_Analyzer"
echo "     bash deploy-from-package.sh $PACKAGE_NAME"
echo ""

