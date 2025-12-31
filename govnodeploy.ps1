# GovnoBot Deployment Script
# Automates deployment and management of GovnoBot instances
# Version: 1.0.0
# Date: 2025-12-31

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'update', 'backup', 'logs', 'install', 'deploy')]
    [string]$Action = 'status',
    
    [Parameter()]
    [string]$Version = "2.2.5",
    
    [Parameter()]
    [string]$BotToken,
    
    [Parameter()]
    [string]$InstanceName = "govnobot",
    
    [Parameter()]
    [switch]$NoLamma,
    
    [Parameter()]
    [switch]$DebugMode,
    
    [Parameter()]
    [string]$LogPath = ".\govnobot_logs\govnodeploy.log",
    
    [Parameter()]
    [string]$BackupPath = ".\govnobot_backups"
)

$ErrorActionPreference = "Stop"

# Configuration
$script:ScriptRoot = if ($PSScriptRoot) {
    $PSScriptRoot
} elseif ($MyInvocation.MyCommand.Path) {
    Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
    Get-Location | Select-Object -ExpandProperty Path
}

$script:ProcessName = "PowerShell"
$script:BotScriptName = "govnobot-$Version.ps1"
$script:BotScriptPath = Join-Path $script:ScriptRoot $script:BotScriptName
$script:DataDirectory = Join-Path $script:ScriptRoot "govnobot_data"

# Resolve log path to absolute path
$script:LogPath = if ([System.IO.Path]::IsPathRooted($LogPath)) {
    $LogPath
} else {
    Join-Path $script:ScriptRoot $LogPath
}

# Resolve backup path to absolute path
$script:BackupPath = ""
if ([System.IO.Path]::IsPathRooted($BackupPath)) {
    $script:BackupPath = $BackupPath
} else {
    Join-Path $script:ScriptRoot $BackupPath
}

# Extract log directory
$script:LogDir = Split-Path -Parent $script:LogPath
if (-not $script:LogDir -or [string]::IsNullOrWhiteSpace($script:LogDir)) {
    $script:LogDir = $script:ScriptRoot
}

$script:StartTime = Get-Date

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
        [string]$Level = 'INFO',
        [switch]$NoNewline
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        'INFO' { $Colors.Info }
        'WARN' { $Colors.Warning }
        'ERROR' { $Colors.Error }
        'SUCCESS' { $Colors.Success }
    }
    
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $color -NoNewline:$NoNewline
    
    # Log to file
    if (-not (Test-Path $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }
    Add-Content -Path $script:LogPath -Value $logMessage
}

function Test-BotRunning {
    param([string]$InstanceName)
    
    $processes = Get-Process PowerShell -ErrorAction SilentlyContinue | 
        Where-Object { $_.CommandLine -like "*$BotScriptName*" }
    
    return $processes.Count -gt 0
}

function Start-Bot {
    param(
        [string]$InstanceName,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode
    )
    
    Write-Log "Starting GovnoBot instance: $InstanceName" "INFO"
    
    # Verify bot script exists
    if (-not (Test-Path $BotScriptPath)) {
        Write-Log "Bot script not found: $BotScriptPath" "ERROR"
        return $false
    }
    
    # Check if already running
    if (Test-BotRunning -InstanceName $InstanceName) {
        Write-Log "Bot instance is already running: $InstanceName" "WARN"
        return $false
    }
    

    $botArgs = @{
        BotToken = $BotToken
        NoLamma = $NoLamma
        Debug = $DebugMode
    }
    
    try {
        # Start bot in background PowerShell process
        $job = Start-Job -FilePath $BotScriptPath -ArgumentList $botArgs -Name $InstanceName
        
        Write-Log "Bot started successfully. Job ID: $($job.Id)" "SUCCESS"
        
        # Wait a moment for startup
        Start-Sleep -Seconds 2
        
        # Verify it's running
        if ($job.State -eq "Running") {
            Write-Log "Bot is running and accepting updates" "SUCCESS"
            return $true
        } else {
            Write-Log "Bot failed to start properly. State: $($job.State)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Failed to start bot: $_" "ERROR"
        return $false
    }
}

function Stop-Bot {
    param([string]$InstanceName)
    
    Write-Log "Stopping GovnoBot instance: $InstanceName" "INFO"
    
    try {
        $jobs = Get-Job -Name $InstanceName -ErrorAction SilentlyContinue
        
        if ($jobs) {
            $jobs | Stop-Job
            Write-Log "Bot stopped successfully" "SUCCESS"
            return $true
        } else {
            Write-Log "No running bot instance found: $InstanceName" "WARN"
            return $false
        }
    }
    catch {
        Write-Log "Failed to stop bot: $_" "ERROR"
        return $false
    }
}

function Get-BotStatus {
    param([string]$InstanceName)
    
    Write-Log "Checking GovnoBot status" "INFO"
    
    $job = Get-Job -Name $InstanceName -ErrorAction SilentlyContinue
    
    if ($job) {
        Write-Host ""
        Write-Host "Instance Name: $InstanceName" -ForegroundColor Cyan
        Write-Host "Status: $($job.State)" -ForegroundColor $(if ($job.State -eq "Running") { "Green" } else { "Red" })
        Write-Host "Job ID: $($job.Id)" -ForegroundColor Cyan
        Write-Host "Started: $($job.PSBeginTime)" -ForegroundColor Cyan
        
        if ($job.ChildJobs.Count -gt 0) {
            $uptime = (Get-Date) - $job.PSBeginTime
            Write-Host "Uptime: $("{0:dd}d {0:hh}h {0:mm}m" -f $uptime)" -ForegroundColor Green
        }
        
        Write-Host "Bot Script: $BotScriptName" -ForegroundColor Cyan
        Write-Host "Data Directory: $script:DataDirectory" -ForegroundColor Cyan
        Write-Host ""
        
        return $true
    } else {
        Write-Log "No running bot instance found: $InstanceName" "WARN"
        Write-Host "Instance: $InstanceName - Status: STOPPED" -ForegroundColor Yellow
        return $false
    }
}

function Restart-Bot {
    param(
        [string]$InstanceName,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode
    )
    
    Write-Log "Restarting GovnoBot instance: $InstanceName" "INFO"
    
    if (Stop-Bot -InstanceName $InstanceName) {
        Start-Sleep -Seconds 2
    }
    
    return Start-Bot -InstanceName $InstanceName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode
}

function Update-Bot {
    param(
        [string]$Version,
        [string]$InstanceName
    )
    
    Write-Log "Updating GovnoBot to version $Version" "INFO"
    
    # Check if new version script exists
    $newScriptName = "govnobot-$Version.ps1"
    $newScriptPath = Join-Path $script:ScriptRoot $newScriptName
    
    if (-not (Test-Path $newScriptPath)) {
        Write-Log "Version script not found: $newScriptPath" "ERROR"
        return $false
    }
    
    # Backup current data
    if (-not (Backup-BotData)) {
        Write-Log "Backup failed, aborting update" "ERROR"
        return $false
    }
    
    # Stop current instance
    if (Test-BotRunning -InstanceName $InstanceName) {
        if (-not (Stop-Bot -InstanceName $InstanceName)) {
            Write-Log "Failed to stop bot for update" "ERROR"
            return $false
        }
        Start-Sleep -Seconds 2
    }
    
    # Update script path reference
    $script:BotScriptName = $newScriptName
    $script:BotScriptPath = $newScriptPath
    
    Write-Log "Update completed. Bot script now points to version $Version" "SUCCESS"
    Write-Log "Run 'govnodeploy start' to restart with new version" "INFO"
    
    return $true
}

function Backup-BotData {
    param([string]$BackupPath = $script:BackupPath)
    
    Write-Log "Backing up bot data" "INFO"
    
    # Create backup directory if it doesn't exist
        if (-not (Test-Path $script:BackupPath)) {
            New-Item -ItemType Directory -Path $script:BackupPath -Force | Out-Null
    }
    
    # Create timestamped backup folder
    $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
        $backupFolder = Join-Path $script:BackupPath "backup_$timestamp"
    
    if (-not (Test-Path $script:DataDirectory)) {
        Write-Log "No data directory to backup" "WARN"
        return $true
    }
    
    try {
        Copy-Item -Path $script:DataDirectory -Destination $backupFolder -Recurse -Force
        Write-Log "Backup created: $backupFolder" "SUCCESS"
        
        # Keep only last 5 backups
        $backups = Get-ChildItem -Path $script:BackupPath -Directory | Sort-Object -Property LastWriteTime -Descending
        if ($backups.Count -gt 5) {
            $backupsToRemove = $backups | Select-Object -Skip 5
            $backupsToRemove | ForEach-Object {
                Remove-Item -Path $_.FullName -Recurse -Force
                Write-Log "Removed old backup: $($_.Name)" "INFO"
            }
        }
        
        return $true
    }
    catch {
        Write-Log "Backup failed: $_" "ERROR"
        return $false
    }
}

function Show-BotLogs {
    param(
        [int]$Lines = 50,
        [string]$InstanceName
    )
    
    Write-Log "Showing bot logs (last $Lines lines)" "INFO"
    
    $logFile = $script:LogPath
    
    if (-not (Test-Path $logFile)) {
        Write-Log "No log file found" "WARN"
        return
    }
    
    Write-Host ""
    Get-Content -Path $logFile -Tail $Lines | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "WARN") {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match "SUCCESS") {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_
        }
    }
    Write-Host ""
}

function Install-Bot {
    param(
        [string]$Version,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode
    )
    
    Write-Log "Installing GovnoBot v$Version" "INFO"
    
    # Create directories
    @($script:LogDir, $script:BackupPath, $script:DataDirectory) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
            Write-Log "Created directory: $_" "INFO"
        }
    }
    
    # Verify bot script exists
    if (-not (Test-Path $BotScriptPath)) {
        Write-Log "Bot script not found: $BotScriptPath" "ERROR"
        Write-Log "Please ensure govnobot-$Version.ps1 exists in the deployment directory" "ERROR"
        return $false
    }
    
    Write-Log "Installation complete" "SUCCESS"
    Write-Log "Next steps:" "INFO"
    Write-Log "1. Set TELEGRAM_GOVNOBOT_TOKEN environment variable or pass -BotToken parameter" "INFO"
    Write-Log "2. Run: govnodeploy start -BotToken 'your_token_here'" "INFO"
    
    return $true
}

function Deploy-Bot {
    Write-Log "Starting GovnoBot deployment process" "INFO"
    
    try {
        $botScriptPath = Join-Path $script:ScriptRoot "govnobot.ps1"
        if (-not (Test-Path $botScriptPath)) {
            Write-Log "Source script not found: $botScriptPath" "ERROR"
            return $false
        }
        
        $botContent = Get-Content -Path $botScriptPath -Raw
        if ($botContent -match '\$script:Version\s*=\s*"([^"]+)') {
            $detectedVersion = $matches[1]
            Write-Log "Detected GovnoBot version: $detectedVersion" "SUCCESS"
        } else {
            Write-Log "Could not detect version from govnobot.ps1" "ERROR"
            return $false
        }
        
        $versionedFileName = "govnobot-$detectedVersion.ps1"
        $versionedFilePath = Join-Path $script:ScriptRoot $versionedFileName
        
        if (Test-Path $versionedFilePath) {
            Write-Log "Versioned file already exists: $versionedFileName" "WARN"
            Write-Log "Overwriting with current govnobot.ps1" "INFO"
        } else {
            Write-Log "Creating new versioned file: $versionedFileName" "INFO"
        }
        
        Copy-Item -Path $botScriptPath -Destination $versionedFilePath -Force
        Write-Log "Successfully deployed version $detectedVersion" "SUCCESS"
        Write-Log "File created: $versionedFilePath" "SUCCESS"
        
        return $true
    }
    catch {
        Write-Log "Deployment failed: $_" "ERROR"
        return $false
    }
}

function Show-Help {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║         GovnoBot Deployment Management Tool v1.0.0             ║
║                                                                ║
║  Usage: govnodeploy.ps1 [action] [options]                     ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ ACTIONS:                                                       ║
║                                                                ║
║  start       - Start a bot instance                            ║
║  stop        - Stop the bot instance                           ║
║  restart     - Restart the bot instance                        ║
║  status      - Check bot status                                ║
║  update      - Update to a new version                         ║
║  backup      - Backup bot data                                 ║
║  logs        - Show recent logs                                ║
║  install     - Install/initialize bot                          ║
║  deploy      - Deploy current govnobot.ps1 as versioned file   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ OPTIONS:                                                       ║
║                                                                ║
║  -BotToken <token>      Telegram bot token                     ║
║  -Version <version>     GovnoBot version (default: 2.2.4)      ║
║  -InstanceName <name>   Instance name (default: govnobot-main) ║
║  -NoLamma               Run without local Ollama               ║
║  -DebugMode             Enable debug mode                      ║
║  -LogPath <path>        Path to log file                      ║
║  -BackupPath <path>     Path to backups directory              ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ EXAMPLES:                                                      ║
║                                                                ║
║  # Start bot with token                                        ║
║  .\govnodeploy.ps1 start -BotToken "5995329297:AAG..."         ║
║                                                                ║
║  # Check bot status                                            ║
║  .\govnodeploy.ps1 status                                      ║
║                                                                ║
║  # Restart bot                                                 ║
║  .\govnodeploy.ps1 restart                                     ║
║                                                                ║
║  # Update to version 2.2.4                                     ║
║  .\govnodeploy.ps1 update -Version 2.2.4                       ║
║                                                                ║
║  # Show recent logs                                            ║
║  .\govnodeploy.ps1 logs -Lines 100                             ║
║                                                                ║
║  # Backup data                                                 ║
║  .\govnodeploy.ps1 backup                                      ║
║                                                                ║
║  # Install/initialize bot                                      ║
║  .\govnodeploy.ps1 install -BotToken "your_token"              ║
║                                                                ║
║  # Deploy current govnobot.ps1 as versioned file               ║
║  .\govnodeploy.ps1 deploy                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
}

# Main execution
try {
    Write-Host ""
    Write-Log "GovnoBot Deployment Tool v1.0.0" "INFO"
    Write-Log "Action: $Action | Instance: $InstanceName" "INFO"
    Write-Host ""
    
    switch ($Action) {
        'start' {
            if (-not $BotToken) {
                $BotToken = $env:TELEGRAM_GOVNOBOT_TOKEN
                if (-not $BotToken) {
                    Write-Log "ERROR: Bot token not provided. Use -BotToken parameter or set TELEGRAM_GOVNOBOT_TOKEN environment variable" "ERROR"
                    exit 1
                }
            }
            
            if (Start-Bot -InstanceName $InstanceName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode) {
                Write-Log "Bot started successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Failed to start bot" "ERROR"
                exit 1
            }
        }
        
        'stop' {
            if (Stop-Bot -InstanceName $InstanceName) {
                Write-Log "Bot stopped successfully" "SUCCESS"
                exit 0
            } else {
                exit 1
            }
        }
        
        'restart' {
            if (-not $BotToken) {
                $BotToken = $env:TELEGRAM_GOVNOBOT_TOKEN
            }
            
            if (Restart-Bot -InstanceName $InstanceName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode) {
                Write-Log "Bot restarted successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Failed to restart bot" "ERROR"
                exit 1
            }
        }
        
        'status' {
            Get-BotStatus -InstanceName $InstanceName
        }
        
        'update' {
            if (Update-Bot -Version $Version -InstanceName $InstanceName) {
                Write-Log "Bot updated successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Failed to update bot" "ERROR"
                exit 1
            }
        }
        
        'backup' {
            if (Backup-BotData) {
                Write-Log "Backup completed successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Backup failed" "ERROR"
                exit 1
            }
        }
        
        'logs' {
            Show-BotLogs -InstanceName $InstanceName
        }
        
        'install' {
            if (Install-Bot -Version $Version -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode) {
                exit 0
            } else {
                exit 1
            }
        }
        
        'deploy' {
            if (Deploy-Bot) {
                Write-Log "Deployment completed successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Deployment failed" "ERROR"
                exit 1
            }
        }
        
        'help' {
            Show-Help
        }
        
        default {
            Show-Help
        }
    }
}
catch {
    Write-Log "Fatal error: $_" "ERROR"
    exit 1
}
