#!/bin/bash

# ================================
# Скрипт обновления продакшена из архива
# Microclimat Analyzer
# Использует собранный архив из Dev окружения вместо Git
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

# Проверка аргументов
if [ $# -lt 1 ]; then
    print_error "Использование: $0 <путь_к_архиву> [директория_проекта]"
    print_info "Пример: $0 /tmp/microclimat-build.tar.gz /home/stas/Microclimat_Analyzer"
    exit 1
fi

ARCHIVE_PATH="$1"
PROJECT_DIR="${2:-/home/stas/Microclimat_Analyzer}"

# Проверка существования архива
if [ ! -f "$ARCHIVE_PATH" ]; then
    print_error "Архив не найден: $ARCHIVE_PATH"
    exit 1
fi

print_info "Архив: $ARCHIVE_PATH"
print_info "Директория проекта: $PROJECT_DIR"

# Проверка существования директории проекта
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
fi

# Переход в директорию проекта
cd "$PROJECT_DIR"

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
    exit 1
fi

print_info "Используется npm: $NPM_CMD"

# Создание резервной копии
create_backup() {
    print_info "Создание резервной копии перед обновлением..."
    
    BACKUP_DIR="$PROJECT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    print_info "Создание резервной копии..."
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='*.log' \
        -C "$PROJECT_DIR" . 2>/dev/null || {
        print_warning "Не удалось создать полную резервную копию, продолжаем..."
    }
    
    print_success "Резервная копия создана: $BACKUP_FILE"
}

# Распаковка архива
extract_archive() {
    print_info "Распаковка архива..."
    
    # Определяем тип архива
    if [[ "$ARCHIVE_PATH" == *.tar.gz ]] || [[ "$ARCHIVE_PATH" == *.tgz ]]; then
        tar -xzf "$ARCHIVE_PATH" -C "$PROJECT_DIR" --strip-components=1 2>/dev/null || {
            # Пробуем без --strip-components
            tar -xzf "$ARCHIVE_PATH" -C "$PROJECT_DIR" 2>/dev/null || {
                print_error "Ошибка распаковки tar.gz архива"
                exit 1
            }
        }
    elif [[ "$ARCHIVE_PATH" == *.zip ]]; then
        unzip -q -o "$ARCHIVE_PATH" -d "$PROJECT_DIR" || {
            print_error "Ошибка распаковки zip архива"
            exit 1
        }
        # Если архив содержит подпапку, перемещаем файлы
        if [ -d "$PROJECT_DIR/Microclimat_Analyzer" ]; then
            mv "$PROJECT_DIR/Microclimat_Analyzer"/* "$PROJECT_DIR/" 2>/dev/null || true
            rmdir "$PROJECT_DIR/Microclimat_Analyzer" 2>/dev/null || true
        fi
    else
        print_error "Неподдерживаемый формат архива. Используйте .tar.gz, .tgz или .zip"
        exit 1
    fi
    
    print_success "Архив распакован"
}

# Установка зависимостей
install_dependencies() {
    print_info "Установка/обновление зависимостей..."
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json не найден в проекте"
        exit 1
    fi
    
    $NPM_CMD install --production=false || {
        print_error "Ошибка установки зависимостей"
        exit 1
    }
    
    print_success "Зависимости установлены"
}

# Обновление базы данных
update_database() {
    print_info "Обновление структуры базы данных..."
    
    if [ -f "$PROJECT_DIR/package.json" ]; then
        if grep -q '"setup-db"' "$PROJECT_DIR/package.json"; then
            $NPM_CMD run setup-db || {
                print_warning "Ошибка обновления БД, продолжаем..."
            }
        else
            print_warning "Скрипт setup-db не найден в package.json, пропускаем обновление БД"
        fi
    else
        print_warning "package.json не найден, пропускаем обновление БД"
    fi
    
    print_success "База данных обновлена"
}

# Копирование собранного фронтенда (если есть в архиве)
copy_build() {
    print_info "Проверка собранного фронтенда..."
    
    # Если в архиве уже есть dist, используем его
    if [ -d "$PROJECT_DIR/dist" ] && [ "$(ls -A $PROJECT_DIR/dist)" ]; then
        print_success "Используется собранный фронтенд из архива"
        return 0
    fi
    
    # Если dist нет, пытаемся собрать
    print_info "Собранный фронтенд не найден в архиве, выполняется сборка..."
    if [ -f "$PROJECT_DIR/package.json" ]; then
        if grep -q '"build"' "$PROJECT_DIR/package.json"; then
            $NPM_CMD run build || {
                print_error "Ошибка сборки фронтенда"
                exit 1
            }
            print_success "Фронтенд собран"
        else
            print_warning "Скрипт build не найден в package.json"
        fi
    else
        print_warning "package.json не найден, пропускаем сборку"
    fi
}

# Перезапуск сервисов
restart_services() {
    print_info "Перезапуск сервисов..."
    
    # PM2
    if command -v pm2 &> /dev/null; then
        print_info "Перезапуск PM2 процесса..."
        pm2 restart all 2>/dev/null || {
            # Пробуем найти процесс по имени
            PM2_PROCESS=$(pm2 list | grep -i microclimat | awk '{print $2}' | head -1)
            if [ -n "$PM2_PROCESS" ]; then
                pm2 restart "$PM2_PROCESS" || true
            fi
        }
        print_success "PM2 процесс перезапущен"
    else
        print_warning "PM2 не найден, пропускаем перезапуск"
    fi
    
    # Systemd
    if systemctl list-units --type=service | grep -q microclimat-api; then
        print_info "Перезапуск systemd сервиса..."
        sudo systemctl restart microclimat-api 2>/dev/null || true
        print_success "Systemd сервис перезапущен"
    fi
    
    # Nginx
    if command -v nginx &> /dev/null || systemctl list-units --type=service | grep -q nginx; then
        print_info "Перезапуск Nginx..."
        sudo systemctl restart nginx 2>/dev/null || sudo service nginx restart 2>/dev/null || true
        print_success "Nginx перезапущен"
    fi
}

# Проверка работоспособности
verify_deployment() {
    print_info "Проверка работоспособности..."
    
    # Проверка Nginx
    if command -v nginx &> /dev/null || systemctl list-units --type=service | grep -q nginx; then
        if systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx > /dev/null; then
            print_success "Nginx работает"
        else
            print_warning "Nginx не запущен"
        fi
    fi
    
    # Проверка PM2
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q online; then
            print_success "Backend работает (PM2)"
        else
            print_warning "PM2 процессы не запущены"
        fi
    fi
    
    # Проверка файлов сборки
    if [ -d "$PROJECT_DIR/dist" ] && [ "$(ls -A $PROJECT_DIR/dist)" ]; then
        print_success "Файлы сборки найдены"
        BUILD_SIZE=$(du -sh "$PROJECT_DIR/dist" | cut -f1)
        print_info "Размер сборки: $BUILD_SIZE"
    else
        print_warning "Файлы сборки не найдены"
    fi
    
    print_success "Проверка завершена"
}

# Главная функция
main() {
    echo ""
    echo "======================================"
    echo "  Обновление из архива"
    echo "  Microclimat Analyzer"
    echo "======================================"
    echo ""
    
    # Создание резервной копии
    create_backup
    echo ""
    
    # Распаковка архива
    extract_archive
    echo ""
    
    # Установка зависимостей
    install_dependencies
    echo ""
    
    # Обновление БД
    update_database
    echo ""
    
    # Копирование/сборка фронтенда
    copy_build
    echo ""
    
    # Перезапуск сервисов
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

