# ================================
# Скрипт обновления продакшена
# Microclimat Analyzer
# Только SSH-ключи (без пароля). Запустите когда сервер станет доступен.
# ================================

param(
    [string]$SshHost = "stas@192.168.98.42",
    [string]$SshKeyPath = "",
    [string]$ProjectDir = "/home/stas/Microclimat_Analyzer"
)

$ErrorActionPreference = "Stop"

# Конфиг из deploy.env (опционально): SSH_HOST, SSH_KEY_PATH
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location | Select-Object -ExpandProperty Path) }
$deployEnvPath = Join-Path $scriptRoot "deploy.env"
if (Test-Path $deployEnvPath) {
    Get-Content $deployEnvPath -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*SSH_HOST=(.*)$') { $SshHost = $matches[1].Trim() }
        if ($_ -match '^\s*SSH_KEY_PATH=(.*)$') {
            $v = $matches[1].Trim() -replace '%USERPROFILE%', $env:USERPROFILE
            if ($v) { $keyPath = if ([System.IO.Path]::IsPathRooted($v)) { $v } else { Join-Path $scriptRoot $v }; if (Test-Path $keyPath) { $SshKeyPath = $keyPath } }
        }
    }
}
# Путь к SSH-ключу: параметр, deploy.env, id_ed25519, id_rsa
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
    $SshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
    if (-not (Test-Path $SshKeyPath)) { $SshKeyPath = "$env:USERPROFILE\.ssh\id_rsa" }
}

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
if (-not (Test-Path $SshKeyPath)) {
    Write-Error "SSH key not found. Required for passwordless update."
    Write-Info "Place key at: $env:USERPROFILE\.ssh\id_rsa or .ssh\id_ed25519"
    Write-Info "Or set SSH_KEY_PATH in deploy.env. Add key on server: ssh-copy-id -i path stas@host"
    exit 1
}
Write-Info "SSH Key: $SshKeyPath (auth by key only)"
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

# Обновление без sudo — только под пользователем SSH (auth по ключу). Ищем каталог и запускаем update-prod.sh или ручные шаги.
$remoteOneLiner = 'D=/opt/Microclimat_Analyzer; [ -d "$D" ] || D=/opt/microclimat-analyzer; [ -d "$D" ] || D=/home/stas/Microclimat_Analyzer; [ -d "$D" ] || D=/var/www/Microclimat_Analyzer; if [ ! -d "$D" ]; then echo "[ERROR] Project dir not found"; exit 1; fi; cd "$D" && (test -f update-prod.sh && chmod +x update-prod.sh && ./update-prod.sh || (git pull origin main && npm install && npm run setup-db || true && npm run build && pm2 restart all || true && echo "[SUCCESS] Done"))'

$sshOpts = @(
    "-i", $SshKeyPath,
    "-o", "StrictHostKeyChecking=no",
    "-o", "PreferredAuthentications=publickey",
    "-o", "PasswordAuthentication=no"
)

try {
    Write-Info "Connecting via SSH key and running update..."
    Write-Host ""
    
    & ssh $sshOpts $SshHost $remoteOneLiner
    
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

