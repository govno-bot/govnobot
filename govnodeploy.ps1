# GovnoBot Deployment Script
# Automates deployment and management of GovnoBot instances using Windows Task Scheduler
# Version: 2.0.0
# Date: 2026-01-08
#
# Changelog v2.0.0:
# - Rewritten to use Windows Task Scheduler instead of PowerShell jobs
# - Added -NoLoop flag support for scheduled execution
# - Improved monitoring and health check capabilities
# - Better process management and automatic restart on failure
# - Added task-based lifecycle management

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'update', 'backup', 'logs', 'install', 'deploy', 'monitor', 'uninstall')]
    [string]$Action = 'status',
    
    [Parameter()]
    [string]$Version = "2.4.7",
    
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
    [string]$BackupPath = ".\govnobot_backups",
    
    [Parameter()]
    [int]$PollInterval = 60,
    
    [Parameter()]
    [string]$TaskName = "GovnoBot"
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

$script:BotScriptName = "govnobot-$Version.ps1"
$script:BotScriptPath = Join-Path $script:ScriptRoot $script:BotScriptName
$script:DataDirectory = Join-Path $script:ScriptRoot "govnobot_data"
$script:TaskName = if ($TaskName) { $TaskName } else { "GovnoBot-$InstanceName" }
$script:TaskDescription = "GovnoBot Telegram Bot - Instance: $InstanceName"

# Resolve log path to absolute path
$script:LogPath = if ([System.IO.Path]::IsPathRooted($LogPath)) {
    $LogPath
} else {
    Join-Path $script:ScriptRoot $LogPath
}

# Resolve backup path to absolute path
if ([System.IO.Path]::IsPathRooted($BackupPath)) {
    $script:BackupPath = $BackupPath
} else {
    $script:BackupPath = Join-Path $script:ScriptRoot $BackupPath
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
    param([string]$TaskName)
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            return $task.State -eq 'Running' -or $task.State -eq 'Ready'
        }
        return $false
    }
    catch {
        return $false
    }
}

function Test-AdminPrivileges {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-BotScheduledTask {
    param(
        [string]$TaskName,
        [string]$BotScriptPath,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode,
        [int]$PollInterval = 60
    )
    
    Write-Log "Creating scheduled task: $TaskName" "INFO"
    
    if (-not (Test-AdminPrivileges)) {
        Write-Log "Administrator privileges required to create scheduled tasks" "ERROR"
        Write-Log "Please run this script as Administrator" "ERROR"
        return $false
    }
    
    if (-not (Test-Path $BotScriptPath)) {
        Write-Log "Bot script not found: $BotScriptPath" "ERROR"
        return $false
    }
    
    # Windows Task Scheduler minimum interval is 1 minute
    if ($PollInterval -lt 60) {
        Write-Log "WARNING: Poll intervals < 60 seconds may not work reliably with Task Scheduler" "WARN"
        Write-Log "Recommended: Use -PollInterval 60 or higher" "WARN"
        $PollInterval = 60
        Write-Log "Adjusting poll interval to 60 seconds" "INFO"
    }
    
    # Build PowerShell arguments
    $psArgs = @(
        "-NoProfile"
        "-ExecutionPolicy", "Bypass"
        "-File", "`"$BotScriptPath`""
        "-BotToken", "`"$BotToken`""
        "-NoLoop"
    )
    
    if ($NoLamma) { $psArgs += "-NoLamma" }
    if ($DebugMode) { $psArgs += "-Debug" }
    
    $psArgsString = $psArgs -join " "
    
    try {
        # Check if task already exists
        $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Write-Log "Task already exists. Removing old task first..." "WARN"
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        }
        
        # Create action - run bot script with NoLoop flag
        $action = New-ScheduledTaskAction `
            -Execute "PowerShell.exe" `
            -Argument $psArgsString `
            -WorkingDirectory $script:ScriptRoot
        
        # Create trigger with repetition (runs indefinitely)
        # We need to use XML approach for indefinite repetition
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date)
        
        # Modify trigger XML to add repetition without duration limit
        $triggerXml = [xml](@"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <TimeTrigger>
      <Repetition>
        <Interval>PT$($PollInterval)S</Interval>
      </Repetition>
      <StartBoundary>$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss")</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal>
      <UserId>$env:USERNAME</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>Queue</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT$([Math]::Max($PollInterval - 5, 30))S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions>
    <Exec>
      <Command>PowerShell.exe</Command>
      <Arguments>$psArgsString</Arguments>
      <WorkingDirectory>$script:ScriptRoot</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@)
        
        # Register task using XML
        try {
            $task = Register-ScheduledTask `
                -TaskName $TaskName `
                -Xml $triggerXml.OuterXml `
                -ErrorAction Stop
        }
        catch {
            Write-Log "Failed to register scheduled task: $_" "ERROR"
            return $false
        }
        
        Write-Log "Scheduled task created successfully" "SUCCESS"
        Write-Log "Task will run every $PollInterval seconds" "INFO"
        
        return $true
    }
    catch {
        Write-Log "Failed to create scheduled task: $_" "ERROR"
        return $false
    }
}

function Start-Bot {
    param(
        [string]$TaskName,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode,
        [int]$PollInterval = 60
    )
    
    Write-Log "Starting GovnoBot via scheduled task: $TaskName" "INFO"
    
    if (-not (Test-AdminPrivileges)) {
        Write-Log "Administrator privileges required" "ERROR"
        return $false
    }
    
    # Verify bot script exists
    if (-not (Test-Path $BotScriptPath)) {
        Write-Log "Bot script not found: $BotScriptPath" "ERROR"
        return $false
    }
    
    # Check if task exists
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if (-not $task) {
        Write-Log "Creating new scheduled task..." "INFO"
        if (-not (New-BotScheduledTask -TaskName $TaskName -BotScriptPath $BotScriptPath -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode -PollInterval $PollInterval)) {
            return $false
        }
        $task = Get-ScheduledTask -TaskName $TaskName
    }
    
    try {
        # Enable the task if it's disabled
        if ($task.State -eq 'Disabled') {
            Write-Log "Enabling disabled task..." "INFO"
            Enable-ScheduledTask -TaskName $TaskName | Out-Null
        }
        
        # Start the task
        Start-ScheduledTask -TaskName $TaskName
        
        Write-Log "Task started successfully" "SUCCESS"
        Start-Sleep -Seconds 2
        
        # Verify it's running
        $task = Get-ScheduledTask -TaskName $TaskName
        if ($task.State -eq 'Running' -or $task.State -eq 'Ready') {
            Write-Log "Bot is active and processing updates" "SUCCESS"
            return $true
        } else {
            Write-Log "Task failed to start properly. State: $($task.State)" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Failed to start task: $_" "ERROR"
        return $false
    }
}

function Stop-Bot {
    param([string]$TaskName)
    
    Write-Log "Stopping GovnoBot task: $TaskName" "INFO"
    
    if (-not (Test-AdminPrivileges)) {
        Write-Log "Administrator privileges required" "ERROR"
        return $false
    }
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        
        if ($task) {
            # First, try to stop any running instances of the task
            Write-Log "Stopping scheduled task..." "INFO"
            Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            
            # Kill any PowerShell processes running the bot script
            Write-Log "Checking for running bot processes..." "INFO"
            $botProcesses = Get-Process PowerShell -ErrorAction SilentlyContinue | 
                Where-Object { $_.CommandLine -like "*$($script:BotScriptName)*" -or $_.CommandLine -like "*govnobot*.ps1*" }
            
            if ($botProcesses) {
                Write-Log "Found $($botProcesses.Count) bot process(es). Stopping..." "INFO"
                foreach ($proc in $botProcesses) {
                    try {
                        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                        Write-Log "Stopped process PID: $($proc.Id)" "INFO"
                    }
                    catch {
                        Write-Log "Failed to stop process $($proc.Id): $_" "WARN"
                    }
                }
            }
            
            # Disable the task so it doesn't restart
            Write-Log "Disabling scheduled task..." "INFO"
            Disable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
            
            # Wait for task to stop
            $maxWait = 10
            $waited = 0
            while ($waited -lt $maxWait) {
                $task = Get-ScheduledTask -TaskName $TaskName
                if ($task.State -ne 'Running') {
                    break
                }
                Start-Sleep -Seconds 1
                $waited++
            }
            
            Write-Log "Task stopped and disabled successfully" "SUCCESS"
            Write-Log "Use 'govnodeploy start' to re-enable and start the task" "INFO"
            return $true
        } else {
            Write-Log "No scheduled task found: $TaskName" "WARN"
            return $false
        }
    }
    catch {
        Write-Log "Failed to stop task: $_" "ERROR"
        return $false
    }
}

function Get-BotStatus {
    param([string]$TaskName)
    
    Write-Log "Checking GovnoBot status" "INFO"
    
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($task) {
        $info = Get-ScheduledTaskInfo -TaskName $TaskName
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║                    GovnoBot Task Status                        ║" -ForegroundColor Cyan
        Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
        Write-Host "  Task Name:        $TaskName" -ForegroundColor White
        Write-Host "  State:            $($task.State)" -ForegroundColor $(if ($task.State -eq 'Running' -or $task.State -eq 'Ready') { 'Green' } else { 'Red' })
        Write-Host "  Last Run:         $($info.LastRunTime)" -ForegroundColor Cyan
        Write-Host "  Last Result:      $($info.LastTaskResult)" -ForegroundColor $(if ($info.LastTaskResult -eq 0) { 'Green' } else { 'Yellow' })
        Write-Host "  Next Run:         $($info.NextRunTime)" -ForegroundColor Cyan
        Write-Host "  Number of Runs:   $($info.NumberOfMissedRuns)" -ForegroundColor Cyan
        Write-Host "  Bot Script:       $BotScriptName" -ForegroundColor White
        Write-Host "  Data Directory:   $script:DataDirectory" -ForegroundColor White
        
        # Check for running PowerShell processes executing the bot
        $processes = Get-Process PowerShell -ErrorAction SilentlyContinue | 
            Where-Object { $_.CommandLine -like "*$BotScriptName*" }
        
        if ($processes) {
            Write-Host "  Active Processes: $($processes.Count)" -ForegroundColor Green
            foreach ($proc in $processes) {
                $uptime = (Get-Date) - $proc.StartTime
                Write-Host "    PID $($proc.Id): Uptime $("{0:hh}h {0:mm}m {0:ss}s" -f $uptime)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  Active Processes: None (waiting for next scheduled run)" -ForegroundColor Yellow
        }
        
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        
        return $true
    } else {
        Write-Log "No scheduled task found: $TaskName" "WARN"
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "║                    GovnoBot Task Status                        ║" -ForegroundColor Yellow
        Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
        Write-Host "  Task Name:        $TaskName" -ForegroundColor White
        Write-Host "  State:            NOT CONFIGURED" -ForegroundColor Red
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Run 'govnodeploy start' to create and start the task" -ForegroundColor Cyan
        Write-Host ""
        return $false
    }
}

function Restart-Bot {
    param(
        [string]$TaskName,
        [string]$BotToken,
        [switch]$NoLamma,
        [switch]$DebugMode,
        [int]$PollInterval = 60
    )
    
    Write-Log "Restarting GovnoBot task: $TaskName" "INFO"
    
    if (Stop-Bot -TaskName $TaskName) {
        Start-Sleep -Seconds 2
    }
    
    return Start-Bot -TaskName $TaskName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode -PollInterval $PollInterval
}

function Remove-BotScheduledTask {
    param([string]$TaskName)
    
    Write-Log "Removing scheduled task: $TaskName" "INFO"
    
    if (-not (Test-AdminPrivileges)) {
        Write-Log "Administrator privileges required" "ERROR"
        return $false
    }
    
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        
        if ($task) {
            # Stop task if running
            if ($task.State -eq 'Running') {
                Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
            
            # Unregister task
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Log "Scheduled task removed successfully" "SUCCESS"
            return $true
        } else {
            Write-Log "No scheduled task found: $TaskName" "WARN"
            return $false
        }
    }
    catch {
        Write-Log "Failed to remove task: $_" "ERROR"
        return $false
    }
}

function Invoke-BotMonitor {
    param(
        [string]$TaskName,
        [int]$CheckInterval = 60
    )
    
    Write-Log "Starting GovnoBot monitor (checking every $CheckInterval seconds)" "INFO"
    Write-Log "Press Ctrl+C to stop monitoring" "INFO"
    
    $consecutiveFailures = 0
    $maxFailures = 3
    
    try {
        while ($true) {
            $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            
            if (-not $task) {
                Write-Log "Task not found: $TaskName. Monitoring stopped." "ERROR"
                break
            }
            
            $info = Get-ScheduledTaskInfo -TaskName $TaskName
            $state = $task.State
            
            # Check task health
            if ($state -eq 'Disabled') {
                Write-Log "Task is disabled. Please enable it manually." "ERROR"
                $consecutiveFailures++
            }
            elseif ($info.LastTaskResult -ne 0 -and $info.LastRunTime -gt (Get-Date).AddMinutes(-5)) {
                Write-Log "Task failed with result: $($info.LastTaskResult)" "ERROR"
                $consecutiveFailures++
            }
            else {
                if ($consecutiveFailures -gt 0) {
                    Write-Log "Task recovered. Resetting failure count." "SUCCESS"
                }
                $consecutiveFailures = 0
                
                Write-Log "Task: $state | Last Run: $($info.LastRunTime) | Result: $($info.LastTaskResult)" "INFO"
            }
            
            # Auto-restart on consecutive failures
            if ($consecutiveFailures -ge $maxFailures) {
                Write-Log "Too many consecutive failures ($consecutiveFailures). Attempting restart..." "WARN"
                
                try {
                    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 3
                    Start-ScheduledTask -TaskName $TaskName
                    Write-Log "Task restarted successfully" "SUCCESS"
                    $consecutiveFailures = 0
                }
                catch {
                    Write-Log "Failed to restart task: $_" "ERROR"
                }
            }
            
            Start-Sleep -Seconds $CheckInterval
        }
    }
    catch {
        Write-Log "Monitor interrupted: $_" "INFO"
    }
}

function Update-Bot {
    param(
        [string]$Version,
        [string]$TaskName
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
    
    # Stop current task
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        if (-not (Stop-Bot -TaskName $TaskName)) {
            Write-Log "Failed to stop task for update" "ERROR"
            return $false
        }
        Start-Sleep -Seconds 2
        
        # Remove old task
        Remove-BotScheduledTask -TaskName $TaskName | Out-Null
    }
    
    # Update script path reference
    $script:BotScriptName = $newScriptName
    $script:BotScriptPath = $newScriptPath
    
    Write-Log "Update completed. Bot script now points to version $Version" "SUCCESS"
    Write-Log "Run 'govnodeploy start -BotToken <token>' to start with new version" "INFO"
    
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
    $dirsToCreate = @($script:LogDir, $script:DataDirectory)
    if ($script:BackupPath -and -not [string]::IsNullOrWhiteSpace($script:BackupPath)) {
        $dirsToCreate += $script:BackupPath
    }
    
    $dirsToCreate | ForEach-Object {
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
║         GovnoBot Deployment Management Tool v2.0.0             ║
║                 Windows Task Scheduler Edition                 ║
║                                                                ║
║  Usage: govnodeploy.ps1 [action] [options]                     ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ ACTIONS:                                                       ║
║                                                                ║
║  start       - Start bot via scheduled task (requires admin)   ║
║  stop        - Stop the scheduled task (requires admin)        ║
║  restart     - Restart the scheduled task (requires admin)     ║
║  status      - Check bot and task status                       ║
║  monitor     - Monitor task health and auto-restart on failure ║
║  update      - Update to a new version                         ║
║  backup      - Backup bot data                                 ║
║  logs        - Show recent logs                                ║
║  install     - Install/initialize bot                          ║
║  deploy      - Deploy current govnobot.ps1 as versioned file   ║
║  uninstall   - Remove scheduled task (requires admin)          ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ OPTIONS:                                                       ║
║                                                                ║
║  -BotToken <token>      Telegram bot token                     ║
║  -Version <version>     GovnoBot version (default: 2.4.7)      ║
║  -InstanceName <name>   Instance name (default: govnobot)      ║
║  -TaskName <name>       Scheduled task name                    ║
║  -PollInterval <sec>    Polling interval in seconds (def: 30)  ║
║  -NoLamma               Run without local Ollama               ║
║  -DebugMode             Enable debug mode                      ║
║  -LogPath <path>        Path to log file                       ║
║  -BackupPath <path>     Path to backups directory              ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ HOW IT WORKS:                                                  ║
║                                                                ║
║  The bot runs via Windows Task Scheduler with -NoLoop flag.    ║
║  Each execution polls once and exits, then the scheduler       ║
║  triggers the next run automatically. This provides:           ║
║                                                                ║
║  ✓ Automatic restart on failure                                ║
║  ✓ Better process management                                   ║
║  ✓ System-level monitoring                                     ║
║  ✓ Clean resource cleanup                                      ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ EXAMPLES:                                                      ║
║                                                                ║
║  # Start bot with token (creates scheduled task)               ║
║  .\govnodeploy.ps1 start -BotToken "5995329297:AAG..."         ║
║                                                                ║
║  # Check bot status                                            ║
║  .\govnodeploy.ps1 status                                      ║
║                                                                ║
║  # Monitor task health (auto-restart on failure)               ║
║  .\govnodeploy.ps1 monitor                                     ║
║                                                                ║
║  # Restart bot                                                 ║
║  .\govnodeploy.ps1 restart -BotToken "5995329297:AAG..."       ║
║                                                                ║
║  # Stop bot                                                    ║
║  .\govnodeploy.ps1 stop                                        ║
║                                                                ║
║  # Update to version 2.4.7                                     ║
║  .\govnodeploy.ps1 update -Version 2.4.7                       ║
║                                                                ║
║  # Show recent logs                                            ║
║  .\govnodeploy.ps1 logs                                        ║
║                                                                ║
║  # Backup data                                                 ║
║  .\govnodeploy.ps1 backup                                      ║
║                                                                ║
║  # Deploy current govnobot.ps1 as versioned file               ║
║  .\govnodeploy.ps1 deploy                                      ║
║                                                                ║
║  # Remove scheduled task                                       ║
║  .\govnodeploy.ps1 uninstall                                   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ NOTES:                                                         ║
║                                                                ║
║  • Admin privileges required for start/stop/restart/uninstall  ║
║  • Task runs under current user account                        ║
║  • Minimum poll interval: 60 seconds (Task Scheduler limit)    ║
║  • Monitor mode runs continuously and auto-restarts on errors  ║
║  • Bot token can also be set via TELEGRAM_GOVNOBOT_TOKEN env   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
}

# Deployment notes: Wikipedia cache & rate limiting
# The Node.js runtime includes an in-memory Wikipedia cache and a token-bucket rate limiter.
# Configure these by setting the following environment variables before starting the bot:
#   $env:WIKI_CACHE_TTL_MS = '300000'   # cache TTL in milliseconds (default 300000)
#   $env:WIKI_RPM = '60'                # requests per minute per host (default 60)
# Example (PowerShell):
#   $env:WIKI_CACHE_TTL_MS = '300000'; $env:WIKI_RPM = '60'; .\govnodeploy.ps1 start -BotToken '...'
# When running under Task Scheduler, ensure these environment variables are set in the task action or global system/user environment so they are visible to the PowerShell process.

# Main execution
try {
    Write-Host ""
    Write-Log "GovnoBot Deployment Tool v2.0.0 (Task Scheduler Edition)" "INFO"
    Write-Log "Action: $Action | Task: $script:TaskName" "INFO"
    Write-Host ""
    
    switch ($Action) {
        'start' {
            if (-not $BotToken) {
                $BotToken = $env:TELEGRAM_GOVNOBOT_TOKEN
                if (-not $BotToken) {
                    Write-Log "Bot token not provided. Use -BotToken parameter or set TELEGRAM_GOVNOBOT_TOKEN environment variable" "ERROR"
                    exit 1
                }
            }
            
            if (Start-Bot -TaskName $script:TaskName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode -PollInterval $PollInterval) {
                Write-Log "Bot started successfully via scheduled task" "SUCCESS"
                Write-Log "Use 'govnodeploy monitor' to watch task health" "INFO"
                exit 0
            } else {
                Write-Log "Failed to start bot" "ERROR"
                exit 1
            }
        }
        
        'stop' {
            if (Stop-Bot -TaskName $script:TaskName) {
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
            
            if (Restart-Bot -TaskName $script:TaskName -BotToken $BotToken -NoLamma:$NoLamma -DebugMode:$DebugMode -PollInterval $PollInterval) {
                Write-Log "Bot restarted successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Failed to restart bot" "ERROR"
                exit 1
            }
        }
        
        'status' {
            Get-BotStatus -TaskName $script:TaskName
        }
        
        'monitor' {
            Invoke-BotMonitor -TaskName $script:TaskName -CheckInterval 60
        }
        
        'update' {
            if (Update-Bot -Version $Version -TaskName $script:TaskName) {
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
        
        'uninstall' {
            if (Remove-BotScheduledTask -TaskName $script:TaskName) {
                Write-Log "Uninstall completed successfully" "SUCCESS"
                exit 0
            } else {
                Write-Log "Uninstall failed" "ERROR"
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
