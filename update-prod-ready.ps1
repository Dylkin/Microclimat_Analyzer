# ================================
# Скрипт обновления продакшена
# Microclimat Analyzer
# Запустите когда сервер станет доступен
# ================================

param(
    [string]$SshHost = "stas@192.168.98.42",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$ProjectDir = "/home/stas/Microclimat_Analyzer"
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Production Update"
Write-Host "  Microclimat Analyzer"
Write-Host "========================================"
Write-Host ""
Write-Info "Server: $SshHost"
Write-Info "Project Directory: $ProjectDir"
if (Test-Path $SshKeyPath) {
    Write-Info "SSH Key: $SshKeyPath"
} else {
    Write-Warning "SSH Key not found at: $SshKeyPath"
}
Write-Host ""

# Проверка наличия SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "SSH not found. Install OpenSSH Client"
    Write-Info "For Windows 10/11 run:"
    Write-Info "Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
    exit 1
}

# Проверка доступности сервера
Write-Info "Checking server availability..."
$pingResult = Test-NetConnection -ComputerName ($SshHost -replace '.*@', '') -Port 22 -WarningAction SilentlyContinue -InformationLevel Quiet

if (-not $pingResult) {
    Write-Error "Server is not reachable. Please check:"
    Write-Info "  1. Server is running"
    Write-Info "  2. Network connection"
    Write-Info "  3. VPN connection (if required)"
    Write-Info "  4. Firewall settings"
    Write-Host ""
    Write-Warning "Project is built locally and ready for deployment."
    Write-Warning "Run this script again when server is available."
    exit 1
}

Write-Success "Server is reachable!"
Write-Host ""

# Команды для выполнения на сервере
$remoteCommands = @'
cd /home/stas/Microclimat_Analyzer || { echo '[ERROR] Project directory not found'; exit 1; }

echo '========================================'
echo '  Updating Microclimat Analyzer'
echo '========================================'
echo ''

# Проверка наличия скрипта обновления
if [ -f update-prod.sh ]; then
    echo '[INFO] Found update-prod.sh script'
    chmod +x update-prod.sh
    echo '[INFO] Running update script...'
    sudo ./update-prod.sh
else
    if [ -f update-production.sh ]; then
        echo '[INFO] Found update-production.sh script'
        chmod +x update-production.sh
        echo '[INFO] Running update script...'
        sudo ./update-production.sh
    else
        echo '[WARNING] Update script not found, running manual update...'
        
        # Обновление кода
        echo '[INFO] Updating code from Git...'
        git pull origin main || { echo '[ERROR] Git pull failed'; exit 1; }
        echo '[SUCCESS] Code updated'
        echo ''
        
        # Установка зависимостей
        echo '[INFO] Installing/updating dependencies...'
        npm install || { echo '[ERROR] npm install failed'; exit 1; }
        echo '[SUCCESS] Dependencies installed'
        echo ''
        
        # Обновление БД (опционально)
        echo '[INFO] Updating database structure...'
        npm run setup-db || echo '[WARNING] Database update failed, continuing...'
        echo ''
        
        # Сборка фронтенда
        echo '[INFO] Building frontend...'
        npm run build || { echo '[ERROR] Build failed'; exit 1; }
        echo '[SUCCESS] Frontend built'
        echo ''
        
        # Перезапуск сервисов
        echo '[INFO] Restarting services...'
        pm2 restart all || echo '[WARNING] PM2 restart failed'
        sudo systemctl restart microclimat-api 2>/dev/null || true
        sudo systemctl reload nginx 2>/dev/null || true
        echo '[SUCCESS] Services restarted'
        echo ''
        
        echo '========================================'
        echo '[SUCCESS] Update completed!'
        echo '========================================'
    fi
fi
'@

try {
    Write-Info "Connecting to server and running update..."
    Write-Host ""
    
    # Используем SSH-ключ явно, если он существует
    if (Test-Path $SshKeyPath) {
        $remoteCommands | ssh -i "$SshKeyPath" -o StrictHostKeyChecking=no "$SshHost" "bash -s"
    } else {
        $remoteCommands | ssh -o StrictHostKeyChecking=no "$SshHost" "bash -s"
    }
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Success "Update successfully completed on server"
        Write-Host ""
        Write-Info "To check status, run on server:"
        Write-Info "  pm2 status"
        Write-Info "  pm2 logs --lines 50"
        Write-Info "  curl http://localhost:3001/health"
    } else {
        Write-Host ""
        Write-Error "Error during update (exit code: $exitCode)"
        exit $exitCode
    }
} catch {
    Write-Error "Error connecting to server: $_"
    Write-Host ""
    Write-Info "Make sure:"
    Write-Info "  1. Server is accessible"
    Write-Info "  2. SSH key is properly configured"
    Write-Info "  3. You have permissions to access the server"
    exit 1
}

