# ================================
# Скрипт удаленного обновления продакшена
# Использует update-production.sh на сервере
# Путь к SSH-ключу и хост берутся из deploy.env в корне проекта (см. setup-ssh-key.bat)
# ================================

param(
    [string]$SshHost = "",
    [string]$SshKeyPath = "",
    [string]$SudoPassword = $env:SUDO_PASSWORD
)

$ErrorActionPreference = "Stop"

# Корень проекта (каталог скрипта или текущий)
$ProjectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location | Select-Object -ExpandProperty Path }
$DeployEnvPath = Join-Path $ProjectRoot "deploy.env"

# Читаем конфиг из deploy.env в проекте
if (Test-Path $DeployEnvPath) {
    Get-Content $DeployEnvPath -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $value = $value -replace '%USERPROFILE%', $env:USERPROFILE
            if ($key -eq 'SSH_KEY_PATH' -and $value -and [string]::IsNullOrWhiteSpace($SshKeyPath)) {
                $SshKeyPath = if ([System.IO.Path]::IsPathRooted($value)) { $value } else { Join-Path $ProjectRoot $value }
            }
            if ($key -eq 'SSH_HOST' -and $value -and [string]::IsNullOrWhiteSpace($SshHost)) { $SshHost = $value }
            if ($key -eq 'SUDO_PASSWORD' -and $value -and [string]::IsNullOrWhiteSpace($SudoPassword)) { $SudoPassword = $value }
        }
    }
}

# Пароль для sudo: параметр, $env:SUDO_PASSWORD, deploy.env (уже выше), bd.env, .env (SUDO_PASSWORD или DB_PASSWORD)
if ([string]::IsNullOrWhiteSpace($SudoPassword)) {
    $bdEnvPath = Join-Path $ProjectRoot "bd.env"
    if (Test-Path $bdEnvPath) {
        Get-Content $bdEnvPath -Encoding UTF8 | ForEach-Object {
            if ($_ -match '^\s*SUDO_PASSWORD=(.*)$') { $SudoPassword = $matches[1].Trim() }
        }
    }
}
if ([string]::IsNullOrWhiteSpace($SudoPassword)) {
    $EnvPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $EnvPath) {
        $envSudo = $null
        $envDb = $null
        Get-Content $EnvPath -Encoding UTF8 | ForEach-Object {
            if ($_ -match '^\s*SUDO_PASSWORD=(.*)$') { $envSudo = $matches[1].Trim() }
            if ($_ -match '^\s*DB_PASSWORD=(.*)$') { $envDb = $matches[1].Trim() }
        }
        if ($envSudo) { $SudoPassword = $envSudo } elseif ($envDb) { $SudoPassword = $envDb }
    }
}

if ([string]::IsNullOrWhiteSpace($SshHost)) { $SshHost = "stas@192.168.98.42" }
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) { $SshKeyPath = "$env:USERPROFILE\.ssh\id_rsa" }

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
$command = "cd /opt/Microclimat_Analyzer 2>/dev/null || cd /home/stas/Microclimat_Analyzer 2>/dev/null || { echo '[ERROR] Project directory not found'; exit 1; }; if [ -f 'update-production.sh' ]; then chmod +x update-production.sh && $sudoCmd ./update-production.sh 2>&1; else echo '[WARNING] update-production.sh not found, running manual update...'; git pull origin main && npm install && npm run migrate || true && npm run build && pm2 restart all || true && $sudoCmd systemctl reload nginx 2>/dev/null || true && echo '[SUCCESS] Update completed!'; fi"

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
