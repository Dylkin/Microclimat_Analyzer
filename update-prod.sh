#!/bin/bash

# ================================
# Скрипт обновления продакшена
# Microclimat Analyzer
# Автоматический режим - все операции выполняются без подтверждений
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
GIT_CMD=""
if command -v git &> /dev/null; then
    GIT_CMD="git"
elif [ -x "/usr/bin/git" ]; then
    GIT_CMD="/usr/bin/git"
elif [ -x "/usr/local/bin/git" ]; then
    GIT_CMD="/usr/local/bin/git"
else
    print_error "Git не установлен или не найден в стандартных путях"
    print_info "Проверьте установку Git: which git"
    exit 1
fi

print_info "Используется Git: $GIT_CMD"

# Проверка наличия Node.js
NODE_CMD=""
if command -v node &> /dev/null; then
    NODE_CMD="node"
elif [ -x "/usr/bin/node" ]; then
    NODE_CMD="/usr/bin/node"
elif [ -x "/usr/local/bin/node" ]; then
    NODE_CMD="/usr/local/bin/node"
else
    print_error "Node.js не установлен или не найден в стандартных путях"
    print_info "Проверьте установку Node.js: which node"
    exit 1
fi

print_info "Используется Node.js: $NODE_CMD"

# Проверка наличия npm
NPM_CMD=""
if command -v npm &> /dev/null; then
    NPM_CMD="npm"
elif [ -x "/usr/bin/npm" ]; then
    NPM_CMD="/usr/bin/npm"
elif [ -x "/usr/local/bin/npm" ]; then
    NPM_CMD="/usr/local/bin/npm"
else
    print_error "npm не установлен или не найден в стандартных путях"
    print_info "Проверьте установку npm: which npm"
    exit 1
fi

print_info "Используется npm: $NPM_CMD"

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
    CURRENT_BRANCH=$($GIT_CMD branch --show-current 2>/dev/null || echo "main")
    print_info "Текущая ветка: $CURRENT_BRANCH"
    
    # Сохранение изменений (если есть)
    if ! $GIT_CMD diff-index --quiet HEAD -- 2>/dev/null; then
        print_warning "Обнаружены незакоммиченные изменения"
        print_info "Продолжаем обновление автоматически..."
    fi
    
    # Получение последних изменений
    $GIT_CMD fetch origin
    
    # Проверка наличия обновлений
    LOCAL=$($GIT_CMD rev-parse @)
    REMOTE=$($GIT_CMD rev-parse @{u} 2>/dev/null || echo "")
    
    if [ -z "$REMOTE" ] || [ "$LOCAL" = "$REMOTE" ]; then
        print_warning "Нет новых изменений в репозитории"
        print_info "Продолжаем обновление автоматически..."
    fi
    
    # Обновление кода
    $GIT_CMD pull origin "$CURRENT_BRANCH"
    
    print_success "Код обновлен"
}

# Функция установки зависимостей
install_dependencies() {
    print_info "Установка/обновление зависимостей..."
    
    $NPM_CMD install
    
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
    if $NPM_CMD run setup-db 2>&1 | tee /tmp/db-update.log; then
        print_success "База данных обновлена"
    else
        print_error "Ошибка при обновлении базы данных"
        print_info "Лог сохранен в /tmp/db-update.log"
        print_warning "Продолжаем обновление автоматически..."
    fi
}

# Функция сборки фронтенда
build_frontend() {
    print_info "Сборка фронтенда..."
    
    if $NPM_CMD run build; then
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
    
    # Создание резервной копии (автоматически)
    print_info "Создание резервной копии перед обновлением..."
    create_backup
    echo ""
    
    # Обновление кода
    update_code
    echo ""
    
    # Установка зависимостей
    install_dependencies
    echo ""
    
    # Обновление БД (автоматически)
    update_database
    echo ""
    
    # Сборка фронтенда
    build_frontend
    echo ""
    
    # Перезапуск сервисов (автоматически)
    restart_services
    echo ""
    
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

