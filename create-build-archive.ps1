# ================================
# Скрипт создания архива для обновления продакшена
# Microclimat Analyzer
# Создает архив с собранным проектом из Dev окружения
# ================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectDir = (Get-Location).Path,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = (Get-Location).Path
)

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Проверка директории проекта
if (-not (Test-Path $ProjectDir)) {
    Write-Error "Директория проекта не найдена: $ProjectDir"
    exit 1
}

Set-Location $ProjectDir

Write-Info "Директория проекта: $ProjectDir"

# Проверка package.json
if (-not (Test-Path "package.json")) {
    Write-Error "package.json не найден. Убедитесь, что вы в корне проекта."
    exit 1
}

# Сборка фронтенда
Write-Info "Сборка фронтенда..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка сборки фронтенда"
        exit 1
    }
    Write-Success "Фронтенд собран"
} else {
    Write-Error "npm не найден"
    exit 1
}

# Проверка наличия dist
if (-not (Test-Path "dist") -or -not (Get-ChildItem "dist" -ErrorAction SilentlyContinue)) {
    Write-Error "Директория dist не найдена или пуста после сборки"
    exit 1
}

# Создание архива
$ArchiveName = "microclimat-build-$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
$ArchivePath = Join-Path $OutputDir $ArchiveName

Write-Info "Создание архива: $ArchivePath"

# Создаем временную директорию
$TempDir = Join-Path $env:TEMP "microclimat_archive_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
    # Копируем необходимые файлы
    Write-Info "Копирование файлов в архив..."
    
    $filesToCopy = @(
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        ".env.example"
    )
    
    foreach ($file in $filesToCopy) {
        if (Test-Path $file) {
            Copy-Item $file $TempDir -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Копируем директории
    $dirsToCopy = @("server", "src", "dist", "supabase")
    foreach ($dir in $dirsToCopy) {
        if (Test-Path $dir) {
            Copy-Item $dir $TempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Копируем database_setup.sql если есть
    if (Test-Path "database_setup.sql") {
        Copy-Item "database_setup.sql" $TempDir -Force -ErrorAction SilentlyContinue
    }
    
    # Создаем архив
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ArchivePath -Force
    
    Write-Success "Архив создан: $ArchivePath"
    $archiveSize = (Get-Item $ArchivePath).Length / 1MB
    Write-Info "Размер архива: $([math]::Round($archiveSize, 2)) MB"
    
    Write-Host ""
    Write-Info "Для обновления продакшена используйте:"
    Write-Info "  .\update-prod-from-archive.ps1 -ArchivePath '$ArchivePath' -ProjectDir '[директория_проекта]'"
    
} finally {
    # Удаляем временную директорию
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

