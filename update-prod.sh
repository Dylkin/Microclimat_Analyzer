#!/bin/bash

# ================================
# Скрипт обновления продакшена
# Microclimat Analyzer
# ================================

set -e  # Выход при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
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

# Определение пути к проекту
if [ -z "$PROJECT_DIR" ]; then
    # Пытаемся определить автоматически
    if [ -d "/var/www/Microclimat_Analyzer" ]; then
        PROJECT_DIR="/var/www/Microclimat_Analyzer"
    elif [ -d "$(pwd)" ] && [ -f "$(pwd)/package.json" ]; then
        PROJECT_DIR="$(pwd)"
    else
        print_error "Не удалось определить директорию проекта"
        print_info "Установите переменную PROJECT_DIR или запустите скрипт из директории проекта"
        exit 1
    fi
fi

print_info "Директория проекта: $PROJECT_DIR"

# Проверка существования директории
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

# Переход в директорию проекта
cd "$PROJECT_DIR"

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    print_error "Git не установлен"
    exit 1
fi

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен"
    exit 1
fi

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    print_error "npm не установлен"
    exit 1
fi

# Функция для создания резервной копии
create_backup() {
    print_info "Создание резервной копии..."
    
    BACKUP_DIR="${PROJECT_DIR}/backups"
    mkdir -p "$BACKUP_DIR"
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${DATE}.tar.gz"
    
    # Создание резервной копии (исключая node_modules и dist)
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='backups' \
        --exclude='.git' \
        -C "$(dirname $PROJECT_DIR)" \
        "$(basename $PROJECT_DIR)" 2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Резервная копия создана: $BACKUP_FILE"
    else
        print_warning "Не удалось создать резервную копию (продолжаем обновление)"
    fi
}

# Функция обновления кода из Git
update_code() {
    print_info "Обновление кода из Git..."
    
    # Определение ветки
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    print_info "Текущая ветка: $CURRENT_BRANCH"
    
    # Сохранение изменений (если есть)
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        print_warning "Обнаружены незакоммиченные изменения"
        read -p "Продолжить обновление? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Обновление отменено"
            exit 1
        fi
    fi
    
    # Получение последних изменений
    git fetch origin
    
    # Проверка наличия обновлений
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
    
    if [ -z "$REMOTE" ] || [ "$LOCAL" = "$REMOTE" ]; then
        print_warning "Нет новых изменений в репозитории"
        read -p "Продолжить обновление? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Обновление отменено"
            exit 0
        fi
    fi
    
    # Обновление кода
    git pull origin "$CURRENT_BRANCH"
    
    print_success "Код обновлен"
}

# Функция установки зависимостей
install_dependencies() {
    print_info "Установка/обновление зависимостей..."
    
    npm install
    
    print_success "Зависимости установлены"
}

# Функция обновления базы данных
update_database() {
    print_info "Обновление структуры базы данных..."
    
    # Проверка наличия скрипта
    if [ ! -f "$PROJECT_DIR/server/scripts/setup-database.ts" ]; then
        print_warning "Скрипт обновления БД не найден, пропускаем этот шаг"
        return
    fi
    
    # Проверка наличия .env файла
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_warning "Файл .env не найден, пропускаем обновление БД"
        return
    fi
    
    # Запуск скрипта обновления БД
    if npm run setup-db 2>&1 | tee /tmp/db-update.log; then
        print_success "База данных обновлена"
    else
        print_error "Ошибка при обновлении базы данных"
        print_info "Лог сохранен в /tmp/db-update.log"
        read -p "Продолжить обновление? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Функция сборки фронтенда
build_frontend() {
    print_info "Сборка фронтенда..."
    
    if npm run build; then
        print_success "Фронтенд собран"
        
        # Проверка наличия dist
        if [ -d "$PROJECT_DIR/dist" ]; then
            SIZE=$(du -sh "$PROJECT_DIR/dist" | cut -f1)
            print_info "Размер сборки: $SIZE"
        fi
    else
        print_error "Ошибка при сборке фронтенда"
        exit 1
    fi
}

# Функция перезапуска сервисов
restart_services() {
    print_info "Перезапуск сервисов..."
    
    # Перезапуск backend (pm2)
    if command -v pm2 &> /dev/null; then
        # Поиск процесса
        PM2_PROCESS=$(pm2 list | grep -i microclimat | head -n1 | awk '{print $2}' || echo "")
        
        if [ -n "$PM2_PROCESS" ]; then
            print_info "Перезапуск PM2 процесса: $PM2_PROCESS"
            pm2 restart "$PM2_PROCESS" || pm2 restart all
            print_success "PM2 процесс перезапущен"
        else
            print_warning "PM2 процесс не найден, пытаемся запустить..."
            if [ -f "$PROJECT_DIR/ecosystem.config.js" ] || [ -f "$PROJECT_DIR/pm2.config.js" ]; then
                pm2 start "$PROJECT_DIR/ecosystem.config.js" || pm2 start "$PROJECT_DIR/pm2.config.js" || true
            else
                print_warning "Конфигурация PM2 не найдена"
            fi
        fi
    fi
    
    # Перезапуск backend (systemd)
    if systemctl list-units --type=service | grep -q "microclimat"; then
        print_info "Перезапуск systemd сервиса..."
        sudo systemctl restart microclimat-api || true
        print_success "Systemd сервис перезапущен"
    fi
    
    # Перезапуск Nginx
    if command -v nginx &> /dev/null; then
        print_info "Перезапуск Nginx..."
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl restart nginx || sudo service nginx restart || true
            print_success "Nginx перезапущен"
        else
            print_error "Ошибка в конфигурации Nginx"
            print_warning "Nginx не перезапущен"
        fi
    fi
}

# Функция проверки работоспособности
verify_deployment() {
    print_info "Проверка работоспособности..."
    
    # Проверка наличия dist
    if [ ! -d "$PROJECT_DIR/dist" ]; then
        print_error "Директория dist не найдена"
        return 1
    fi
    
    # Проверка Nginx
    if command -v nginx &> /dev/null; then
        if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null; then
            print_success "Nginx работает"
        else
            print_warning "Nginx не запущен"
        fi
    fi
    
    # Проверка backend (pm2)
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 list | grep -i microclimat | grep -i online | wc -l)
        if [ "$PM2_STATUS" -gt 0 ]; then
            print_success "Backend работает (PM2)"
        else
            print_warning "Backend не найден в PM2"
        fi
    fi
    
    print_success "Проверка завершена"
}

# Главная функция
main() {
    echo ""
    echo "======================================"
    echo "  Обновление Microclimat Analyzer"
    echo "======================================"
    echo ""
    
    # Создание резервной копии (опционально)
    read -p "Создать резервную копию перед обновлением? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_backup
        echo ""
    fi
    
    # Обновление кода
    update_code
    echo ""
    
    # Установка зависимостей
    install_dependencies
    echo ""
    
    # Обновление БД
    read -p "Обновить структуру базы данных? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_database
        echo ""
    fi
    
    # Сборка фронтенда
    build_frontend
    echo ""
    
    # Перезапуск сервисов
    read -p "Перезапустить сервисы? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        restart_services
        echo ""
    fi
    
    # Проверка работоспособности
    verify_deployment
    echo ""
    
    echo "======================================"
    print_success "Обновление завершено!"
    echo "======================================"
    echo ""
    print_info "Проект обновлен в: $PROJECT_DIR"
    echo ""
}

# Запуск
main

