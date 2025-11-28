# ================================
# Скрипт обновления продакшена
# Microclimat Analyzer (PowerShell)
# ================================

$ErrorActionPreference = "Stop"

# Цвета для вывода
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Определение пути к проекту
if (-not $env:PROJECT_DIR) {
    # Пытаемся определить автоматически
    if (Test-Path "C:\var\www\Microclimat_Analyzer") {
        $PROJECT_DIR = "C:\var\www\Microclimat_Analyzer"
    } elseif (Test-Path (Join-Path $PSScriptRoot "package.json")) {
        $PROJECT_DIR = $PSScriptRoot
    } elseif (Test-Path (Join-Path (Get-Location) "package.json")) {
        $PROJECT_DIR = Get-Location
    } else {
        Write-Error "Не удалось определить директорию проекта"
        Write-Info "Установите переменную PROJECT_DIR или запустите скрипт из директории проекта"
        exit 1
    }
} else {
    $PROJECT_DIR = $env:PROJECT_DIR
}

Write-Info "Директория проекта: $PROJECT_DIR"

# Проверка существования директории
if (-not (Test-Path $PROJECT_DIR)) {
    Write-Error "Директория проекта не найдена: $PROJECT_DIR"
    exit 1
}

# Переход в директорию проекта
Set-Location $PROJECT_DIR

# Проверка наличия Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git не установлен"
    exit 1
}

# Проверка наличия Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js не установлен"
    exit 1
}

# Проверка наличия npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm не установлен"
    exit 1
}

# Функция для создания резервной копии
function Create-Backup {
    Write-Info "Создание резервной копии..."
    
    $BACKUP_DIR = Join-Path $PROJECT_DIR "backups"
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }
    
    $DATE = Get-Date -Format "yyyyMMdd_HHmmss"
    $BACKUP_FILE = Join-Path $BACKUP_DIR "backup_$DATE.zip"
    
    # Создание резервной копии (исключая node_modules и dist)
    $EXCLUDE_PATTERNS = @("node_modules", "dist", "backups", ".git")
    $FILES_TO_BACKUP = Get-ChildItem -Path $PROJECT_DIR -Exclude $EXCLUDE_PATTERNS | Where-Object { $_.Name -notin $EXCLUDE_PATTERNS }
    
    try {
        Compress-Archive -Path $FILES_TO_BACKUP.FullName -DestinationPath $BACKUP_FILE -Force
        Write-Success "Резервная копия создана: $BACKUP_FILE"
    } catch {
        Write-Warning "Не удалось создать резервную копию (продолжаем обновление): $_"
    }
}

# Функция обновления кода из Git
function Update-Code {
    Write-Info "Обновление кода из Git..."
    
    # Определение ветки
    $CURRENT_BRANCH = git branch --show-current 2>$null
    if (-not $CURRENT_BRANCH) {
        $CURRENT_BRANCH = "main"
    }
    Write-Info "Текущая ветка: $CURRENT_BRANCH"
    
    # Сохранение изменений (если есть)
    $STATUS = git status --porcelain 2>$null
    if ($STATUS) {
        Write-Warning "Обнаружены незакоммиченные изменения"
        $response = Read-Host "Продолжить обновление? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Error "Обновление отменено"
            exit 1
        }
    }
    
    # Получение последних изменений
    git fetch origin
    
    # Проверка наличия обновлений
    $LOCAL = git rev-parse @ 2>$null
    $REMOTE = git rev-parse @{u} 2>$null
    
    if (-not $REMOTE -or $LOCAL -eq $REMOTE) {
        Write-Warning "Нет новых изменений в репозитории"
        $response = Read-Host "Продолжить обновление? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Info "Обновление отменено"
            exit 0
        }
    }
    
    # Обновление кода
    git pull origin $CURRENT_BRANCH
    
    Write-Success "Код обновлен"
}

# Функция установки зависимостей
function Install-Dependencies {
    Write-Info "Установка/обновление зависимостей..."
    
    npm install
    
    Write-Success "Зависимости установлены"
}

# Функция обновления базы данных
function Update-Database {
    Write-Info "Обновление структуры базы данных..."
    
    # Проверка наличия скрипта
    $SETUP_SCRIPT = Join-Path $PROJECT_DIR "server\scripts\setup-database.ts"
    if (-not (Test-Path $SETUP_SCRIPT)) {
        Write-Warning "Скрипт обновления БД не найден, пропускаем этот шаг"
        return
    }
    
    # Проверка наличия .env файла
    $ENV_FILE = Join-Path $PROJECT_DIR ".env"
    if (-not (Test-Path $ENV_FILE)) {
        Write-Warning "Файл .env не найден, пропускаем обновление БД"
        return
    }
    
    # Запуск скрипта обновления БД
    $LOG_FILE = Join-Path $env:TEMP "db-update.log"
    try {
        npm run setup-db 2>&1 | Tee-Object -FilePath $LOG_FILE
        Write-Success "База данных обновлена"
    } catch {
        Write-Error "Ошибка при обновлении базы данных"
        Write-Info "Лог сохранен в $LOG_FILE"
        $response = Read-Host "Продолжить обновление? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    }
}

# Функция сборки фронтенда
function Build-Frontend {
    Write-Info "Сборка фронтенда..."
    
    try {
        npm run build
        
        Write-Success "Фронтенд собран"
        
        # Проверка наличия dist
        $DIST_DIR = Join-Path $PROJECT_DIR "dist"
        if (Test-Path $DIST_DIR) {
            $SIZE = (Get-ChildItem -Path $DIST_DIR -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Info "Размер сборки: $([math]::Round($SIZE, 2)) MB"
        }
    } catch {
        Write-Error "Ошибка при сборке фронтенда: $_"
        exit 1
    }
}

# Функция перезапуска сервисов
function Restart-Services {
    Write-Info "Перезапуск сервисов..."
    
    # Перезапуск backend (pm2)
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $PM2_PROCESS = pm2 list 2>$null | Select-String -Pattern "microclimat" | Select-Object -First 1
        if ($PM2_PROCESS) {
            Write-Info "Перезапуск PM2 процесса..."
            pm2 restart all 2>$null
            Write-Success "PM2 процесс перезапущен"
        } else {
            Write-Warning "PM2 процесс не найден"
        }
    }
    
    # Перезапуск backend (Windows Service)
    $SERVICE_NAME = "MicroclimatAnalyzer"
    $SERVICE = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
    if ($SERVICE) {
        Write-Info "Перезапуск Windows сервиса: $SERVICE_NAME"
        Restart-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
        Write-Success "Windows сервис перезапущен"
    }
    
    # Перезапуск IIS (если используется)
    if (Get-Command "iisreset" -ErrorAction SilentlyContinue) {
        Write-Info "Перезапуск IIS..."
        iisreset /noforce 2>$null
        Write-Success "IIS перезапущен"
    }
    
    Write-Success "Сервисы перезапущены"
}

# Функция проверки работоспособности
function Verify-Deployment {
    Write-Info "Проверка работоспособности..."
    
    # Проверка наличия dist
    $DIST_DIR = Join-Path $PROJECT_DIR "dist"
    if (-not (Test-Path $DIST_DIR)) {
        Write-Error "Директория dist не найдена"
        return $false
    }
    
    # Проверка PM2
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $PM2_STATUS = pm2 list 2>$null | Select-String -Pattern "online"
        if ($PM2_STATUS) {
            Write-Success "Backend работает (PM2)"
        } else {
            Write-Warning "Backend не найден в PM2"
        }
    }
    
    Write-Success "Проверка завершена"
    return $true
}

# Главная функция
function Main {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Обновление Microclimat Analyzer" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Создание резервной копии (опционально)
    $response = Read-Host "Создать резервную копию перед обновлением? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Create-Backup
        Write-Host ""
    }
    
    # Обновление кода
    Update-Code
    Write-Host ""
    
    # Установка зависимостей
    Install-Dependencies
    Write-Host ""
    
    # Обновление БД
    $response = Read-Host "Обновить структуру базы данных? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Update-Database
        Write-Host ""
    }
    
    # Сборка фронтенда
    Build-Frontend
    Write-Host ""
    
    # Перезапуск сервисов
    $response = Read-Host "Перезапустить сервисы? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Restart-Services
        Write-Host ""
    }
    
    # Проверка работоспособности
    Verify-Deployment
    Write-Host ""
    
    Write-Host "======================================" -ForegroundColor Green
    Write-Success "Обновление завершено!"
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "Проект обновлен в: $PROJECT_DIR"
    Write-Host ""
}

# Запуск
Main

