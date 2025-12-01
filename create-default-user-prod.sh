#!/bin/bash

# ============================================
# Скрипт создания пользователя по умолчанию
# на продакшене
# ============================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Определение директории проекта
if [ -d "/home/stas/Microclimat_Analyzer" ]; then
    PROJECT_DIR="/home/stas/Microclimat_Analyzer"
    PROJECT_USER="stas"
elif [ -d "/opt/microclimat-analyzer" ]; then
    PROJECT_DIR="/opt/microclimat-analyzer"
    PROJECT_USER="$(stat -c '%U' "$PROJECT_DIR")"
else
    read -p "Введите путь к директории проекта: " PROJECT_DIR
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Директория не найдена: $PROJECT_DIR"
        exit 1
    fi
    PROJECT_USER="$(stat -c '%U' "$PROJECT_DIR")"
fi

print_info "Директория проекта: $PROJECT_DIR"
print_info "Пользователь проекта: $PROJECT_USER"

# Проверка наличия .env файла
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_error "Файл .env не найден: $ENV_FILE"
    print_info "Убедитесь, что файл .env существует и содержит настройки базы данных"
    exit 1
fi

print_success "Файл .env найден"

# Переход в директорию проекта
cd "$PROJECT_DIR"

# Проверка наличия скрипта
if [ ! -f "server/scripts/create-default-user.ts" ]; then
    print_error "Скрипт создания пользователя не найден: server/scripts/create-default-user.ts"
    exit 1
fi

# Проверка наличия package.json
if [ ! -f "package.json" ]; then
    print_error "package.json не найден"
    exit 1
fi

# Проверка наличия скрипта в package.json
if ! grep -q "create-default-user" package.json; then
    print_error "Скрипт create-default-user не найден в package.json"
    exit 1
fi

print_info "Создание пользователя по умолчанию..."

# Запуск скрипта создания пользователя
if [ "$EUID" -eq 0 ]; then
    # Если запущено от root, переключаемся на пользователя проекта
    sudo -u "$PROJECT_USER" npm run create-default-user
else
    # Если запущено от обычного пользователя
    npm run create-default-user
fi

if [ $? -eq 0 ]; then
    print_success "Пользователь по умолчанию создан успешно"
    print_info "Email: pavel.dylkin@gmail.com"
    print_info "Пароль: 00016346"
    print_info "Роль: admin"
else
    print_error "Ошибка при создании пользователя по умолчанию"
    exit 1
fi

