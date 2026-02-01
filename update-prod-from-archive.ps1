# ================================
# Скрипт обновления продакшена из архива
# Microclimat Analyzer
# Использует собранный архив из Dev окружения вместо Git
# ================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ArchivePath,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectDir = "C:\Microclimat_Analyzer"
)

# Функции для вывода
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
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

# Проверка архива
if (-not (Test-Path $ArchivePath)) {
    Write-Error "Архив не найден: $ArchivePath"
    exit 1
}

Write-Info "Архив: $ArchivePath"
Write-Info "Директория проекта: $ProjectDir"

# Проверка директории проекта
if (-not (Test-Path $ProjectDir)) {
    Write-Error "Директория проекта не найдена: $ProjectDir"
    exit 1
}

Set-Location $ProjectDir

# Проверка Node.js и npm
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js не установлен"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm не установлен"
    exit 1
}

Write-Info "Используется Node.js: $(node --version)"
Write-Info "Используется npm: $(npm --version)"

# Создание резервной копии
function Create-Backup {
    Write-Info "Создание резервной копии перед обновлением..."
    
    $BackupDir = Join-Path $ProjectDir "backups"
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    $BackupFile = Join-Path $BackupDir "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
    
    Write-Info "Создание резервной копии..."
    try {
        $exclude = @('node_modules', 'dist', '.git', 'backups', '*.log')
        Compress-Archive -Path "$ProjectDir\*" -DestinationPath $BackupFile -Force -ErrorAction SilentlyContinue
        Write-Success "Резервная копия создана: $BackupFile"
    } catch {
        Write-Warning "Не удалось создать полную резервную копию, продолжаем..."
    }
}

# Распаковка архива
function Extract-Archive {
    Write-Info "Распаковка архива..."
    
    try {
        $tempExtract = Join-Path $env:TEMP "microclimat_extract_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
        
        Expand-Archive -Path $ArchivePath -DestinationPath $tempExtract -Force
        
        # Копируем файлы из архива в проект
        $extractedContent = Get-ChildItem $tempExtract
        if ($extractedContent.Count -eq 1 -and $extractedContent[0].PSIsContainer) {
            # Если архив содержит одну папку, копируем её содержимое
            Copy-Item -Path "$($extractedContent[0].FullName)\*" -Destination $ProjectDir -Recurse -Force
        } else {
            # Иначе копируем всё содержимое
            Copy-Item -Path "$tempExtract\*" -Destination $ProjectDir -Recurse -Force
        }
        
        # Удаляем временную папку
        Remove-Item -Path $tempExtract -Recurse -Force
        
        Write-Success "Архив распакован"
    } catch {
        Write-Error "Ошибка распаковки архива: $_"
        exit 1
    }
}

# Установка зависимостей
function Install-Dependencies {
    Write-Info "Установка/обновление зависимостей..."
    
    if (-not (Test-Path "$ProjectDir\package.json")) {
        Write-Error "package.json не найден в проекте"
        exit 1
    }
    
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка установки зависимостей"
        exit 1
    }
    
    Write-Success "Зависимости установлены"
}

# Обновление базы данных
function Update-Database {
    Write-Info "Обновление структуры базы данных..."
    
    if (Test-Path "$ProjectDir\package.json") {
        $packageJson = Get-Content "$ProjectDir\package.json" | ConvertFrom-Json
        if ($packageJson.scripts.'setup-db') {
            npm run setup-db
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Ошибка обновления БД, продолжаем..."
            }
        } else {
            Write-Warning "Скрипт setup-db не найден в package.json, пропускаем обновление БД"
        }
    } else {
        Write-Warning "package.json не найден, пропускаем обновление БД"
    }
    
    Write-Success "База данных обновлена"
}

# Копирование/сборка фронтенда
function Copy-Build {
    Write-Info "Проверка собранного фронтенда..."
    
    # Если в архиве уже есть dist, используем его
    if ((Test-Path "$ProjectDir\dist") -and (Get-ChildItem "$ProjectDir\dist" -ErrorAction SilentlyContinue)) {
        Write-Success "Используется собранный фронтенд из архива"
        return
    }
    
    # Если dist нет, пытаемся собрать
    Write-Info "Собранный фронтенд не найден в архиве, выполняется сборка..."
    if (Test-Path "$ProjectDir\package.json") {
        $packageJson = Get-Content "$ProjectDir\package.json" | ConvertFrom-Json
        if ($packageJson.scripts.build) {
            npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Ошибка сборки фронтенда"
                exit 1
            }
            Write-Success "Фронтенд собран"
        } else {
            Write-Warning "Скрипт build не найден в package.json"
        }
    } else {
        Write-Warning "package.json не найден, пропускаем сборку"
    }
}

# Перезапуск сервисов
function Restart-Services {
    Write-Info "Перезапуск сервисов..."
    
    # PM2
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        Write-Info "Перезапуск PM2 процесса..."
        pm2 restart all 2>$null
        Write-Success "PM2 процесс перезапущен"
    } else {
        Write-Warning "PM2 не найден, пропускаем перезапуск"
    }
    
    # IIS (если используется)
    if (Get-Service W3SVC -ErrorAction SilentlyContinue) {
        Write-Info "Перезапуск IIS..."
        iisreset /restart 2>$null
        Write-Success "IIS перезапущен"
    }
    
    Write-Success "Сервисы перезапущены"
}

# Проверка работоспособности
function Verify-Deployment {
    Write-Info "Проверка работоспособности..."
    
    # Проверка PM2
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $pm2Status = pm2 list 2>$null
        if ($pm2Status -match "online") {
            Write-Success "Backend работает (PM2)"
        } else {
            Write-Warning "PM2 процессы не запущены"
        }
    }
    
    # Проверка файлов сборки
    if ((Test-Path "$ProjectDir\dist") -and (Get-ChildItem "$ProjectDir\dist" -ErrorAction SilentlyContinue)) {
        Write-Success "Файлы сборки найдены"
        $buildSize = (Get-ChildItem "$ProjectDir\dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Info "Размер сборки: $([math]::Round($buildSize, 2)) MB"
    } else {
        Write-Warning "Файлы сборки не найдены"
    }
    
    Write-Success "Проверка завершена"
}

# Главная функция
function Main {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "  Обновление из архива" -ForegroundColor Cyan
    Write-Host "  Microclimat Analyzer" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Создание резервной копии
    Create-Backup
    Write-Host ""
    
    # Распаковка архива
    Extract-Archive
    Write-Host ""
    
    # Установка зависимостей
    Install-Dependencies
    Write-Host ""
    
    # Обновление БД
    Update-Database
    Write-Host ""
    
    # Копирование/сборка фронтенда
    Copy-Build
    Write-Host ""
    
    # Перезапуск сервисов
    Restart-Services
    Write-Host ""
    
    # Проверка работоспособности
    Verify-Deployment
    Write-Host ""
    
    Write-Host "======================================" -ForegroundColor Green
    Write-Success "Обновление завершено!"
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "Проект обновлен в: $ProjectDir"
    Write-Host ""
}

# Запуск
Main

