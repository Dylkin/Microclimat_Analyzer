# Script for automatic update-prod.sh execution on remote server
# Microclimat Analyzer (PowerShell version with automatic password transmission)

$SSH_HOST = "stas@192.168.98.42"
$PROJECT_DIR = "/home/stas/Microclimat_Analyzer"
$SSH_PASSWORD = ""

# Parameters can be passed
if ($args.Count -gt 0) { $SSH_HOST = $args[0] }
if ($args.Count -gt 1) { $PROJECT_DIR = $args[1] }
if ($args.Count -gt 2) { $SSH_PASSWORD = $args[2] }

if ([string]::IsNullOrWhiteSpace($SSH_PASSWORD)) {
    $secure = Read-Host "Enter SSH/sudo password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $SSH_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Starting production update"
Write-Host "========================================"
Write-Host ""
Write-Host "[INFO] Server: $SSH_HOST"
Write-Host "[INFO] Directory: $PROJECT_DIR"
Write-Host ""

# Check for SSH
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshPath) {
    Write-Host "[ERROR] SSH not found!"
    Write-Host "[INFO] Install OpenSSH Client:"
    Write-Host "       Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[INFO] Connecting to server and running update-prod.sh..."
Write-Host ""

# Try plink first (PuTTY) - best option for Windows
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
if ($plinkPath) {
    Write-Host "[INFO] Using plink for automatic password transmission..."
    $command = "cd $PROJECT_DIR; echo $SSH_PASSWORD | sudo -S bash update-prod.sh"
    echo y | plink -ssh -pw $SSH_PASSWORD $SSH_HOST $command
    $exitCode = $LASTEXITCODE
} else {
    # Try WSL with sshpass
    $wslPath = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslPath) {
        Write-Host "[INFO] Using WSL with sshpass..."
        $command = "sshpass -p '$SSH_PASSWORD' ssh -o StrictHostKeyChecking=no $SSH_HOST 'cd $PROJECT_DIR; echo $SSH_PASSWORD | sudo -S bash update-prod.sh'"
        wsl bash -c $command
        $exitCode = $LASTEXITCODE
    } else {
        # Use regular SSH (will require manual password input)
        Write-Host "[WARNING] Automatic password transmission not available"
        Write-Host ""
        Write-Host "[INFO] You can install plink (PuTTY) for automatic password transmission:"
        Write-Host "       Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html"
        Write-Host ""
        $command = "cd $PROJECT_DIR; echo '$SSH_PASSWORD' | sudo -S bash update-prod.sh"
        ssh $SSH_HOST $command
        $exitCode = $LASTEXITCODE
    }
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "========================================"
    Write-Host "[SUCCESS] Update completed successfully!"
    Write-Host "========================================"
} else {
    Write-Host "========================================"
    Write-Host "[ERROR] Error during update execution"
    Write-Host "Exit code: $exitCode"
    Write-Host "========================================"
}

Write-Host ""
Read-Host "Press Enter to exit"
exit $exitCode
