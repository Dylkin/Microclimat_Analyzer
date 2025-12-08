# ================================
# Скрипт удаленного обновления продакшена
# Microclimat Analyzer (Windows PowerShell)
# ================================

param(
    [string]$SshHost = "stas@192.168.98.42",
    [string]$ProjectDir = "/home/stas/Microclimat_Analyzer"
)

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

Write-Info "Подключение к серверу: $SshHost"
Write-Info "Директория проекта: $ProjectDir"
Write-Host ""

# Проверка наличия SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "SSH не найден. Установите OpenSSH или используйте PuTTY"
    Write-Info "Для Windows 10/11: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
    exit 1
}

# Команды для выполнения на удаленном сервере
$remoteCommands = @'
cd /home/stas/Microclimat_Analyzer || exit 1

echo "======================================"
echo "  Обновление Microclimat Analyzer"
echo "======================================"
echo ""

# Проверяем наличие скрипта update-production.sh
if [ -f "update-production.sh" ]; then
    echo "[INFO] Найден скрипт update-production.sh"
    chmod +x update-production.sh
    echo "[INFO] Запуск скрипта обновления..."
    sudo ./update-production.sh
else
    echo "[WARNING] Скрипт update-production.sh не найден, выполняем обновление вручную..."
    
    # Обновление кода
    echo "[INFO] Обновление кода из Git..."
    git pull origin main || exit 1
    echo "[SUCCESS] Код обновлен"
    echo ""
    
    # Установка зависимостей
    echo "[INFO] Установка/обновление зависимостей..."
    npm install || exit 1
    echo "[SUCCESS] Зависимости установлены"
    echo ""
    
    # Обновление БД
    echo "[INFO] Обновление структуры базы данных..."
    npm run setup-db || echo "[WARNING] Ошибка обновления БД, продолжаем..."
    echo ""
    
    # Сборка фронтенда
    echo "[INFO] Сборка фронтенда..."
    npm run build || exit 1
    echo "[SUCCESS] Фронтенд собран"
    echo ""
    
    # Перезапуск сервисов
    echo "[INFO] Перезапуск сервисов..."
    pm2 restart all || echo "[WARNING] PM2 не найден или не запущен"
    sudo systemctl restart microclimat-api 2>/dev/null || true
    sudo systemctl restart nginx 2>/dev/null || true
    echo "[SUCCESS] Сервисы перезапущены"
    echo ""
    
    echo "======================================"
    echo "[SUCCESS] Обновление завершено!"
    echo "======================================"
fi
'@

try {
    Write-Info "Выполнение обновления на удаленном сервере..."
    Write-Host ""
    
    # Выполнение команд через SSH
    $remoteCommands | ssh $SshHost "bash -s"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Success "Обновление успешно выполнено на сервере"
        exit 0
    } else {
        Write-Host ""
        Write-Error "Ошибка при выполнении обновления (код выхода: $LASTEXITCODE)"
        exit 1
    }
} catch {
    Write-Error "Ошибка подключения к серверу: $_"
    Write-Info "Проверьте:"
    Write-Info "  1. Доступность сервера: $SshHost"
    Write-Info "  2. Наличие SSH ключа или пароля"
    Write-Info "  3. Правильность пути к проекту: $ProjectDir"
    exit 1
}
