# ================================
# Скрипт удаленного обновления продакшена
# Использует update-production.sh на сервере
# ================================

param(
    [string]$SshHost = "stas@192.168.98.42",
    [string]$SshKeyPath = "$env:USERPROFILE\.ssh\id_rsa",
    [string]$SudoPassword = $env:SUDO_PASSWORD
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

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Production Update"
Write-Host "  Microclimat Analyzer"
Write-Host "========================================"
Write-Host ""
Write-Info "Server: $SshHost"
if (Test-Path $SshKeyPath) {
    Write-Info "SSH Key: $SshKeyPath"
} else {
    Write-Info "SSH Key: Using default key from SSH agent"
}
Write-Host ""

# Проверка наличия SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "SSH not found. Install OpenSSH Client"
    Write-Info "For Windows 10/11 run:"
    Write-Info "Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Connecting to server and running update-production.sh..."
Write-Host ""

# Формируем команду с учетом наличия пароля sudo
if ($SudoPassword) {
    # Если пароль предоставлен, используем его для sudo
    # Экранируем пароль для безопасной передачи в bash
    $escapedPassword = $SudoPassword -replace "'", "'\''"
    $sudoCmd = "echo '$escapedPassword' | sudo -S"
} else {
    # Пытаемся без пароля (если sudo настроен без пароля)
    $sudoCmd = "sudo"
}

# Выполняем команды через SSH одной строкой
$command = "cd /opt/Microclimat_Analyzer 2>/dev/null || cd /home/stas/Microclimat_Analyzer 2>/dev/null || { echo '[ERROR] Project directory not found'; exit 1; }; if [ -f 'update-production.sh' ]; then chmod +x update-production.sh && $sudoCmd ./update-production.sh 2>&1; else echo '[WARNING] update-production.sh not found, running manual update...'; git pull origin main && npm install && npm run setup-db || true && npm run build && pm2 restart all || true && $sudoCmd systemctl reload nginx 2>/dev/null || true && echo '[SUCCESS] Update completed!'; fi"

try {
    # Используем SSH-ключ явно, если он существует
    if (Test-Path $SshKeyPath) {
        ssh -i "$SshKeyPath" -o StrictHostKeyChecking=no "$SshHost" $command
    } else {
        ssh -o StrictHostKeyChecking=no "$SshHost" $command
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
    exit 1
}
