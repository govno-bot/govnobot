# GovnoBot Node.js Management Script
# Manages Windows Task Scheduler task for Node.js bot

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'install')]
    [string]$Action = 'status',

    [Parameter()]
    [string]$TaskName = 'GovnoBotNode'
)

$ErrorActionPreference = 'Stop'

function Test-AdminPrivileges {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Status {
    param([string]$Message, [string]$Type = 'Info')
    $colors = @{
        'Success' = 'Green'
        'Error' = 'Red'
        'Warning' = 'Yellow'
        'Info' = 'Cyan'
    }
    $color = $colors[$Type]
    if (-not $color) { $color = 'White' }
    Write-Host $Message -ForegroundColor $color
}

if (-not (Test-AdminPrivileges)) {
    Write-Status 'ERROR: Administrator privileges required. Please run as Administrator.' Error
    exit 1
}

switch ($Action) {
    'stop' {
        Write-Status "`nStopping GovnoBot Node.js (Task: $TaskName)..." Info
        $nodeProcs = Get-Process node -ErrorAction SilentlyContinue
        if ($nodeProcs) {
            Write-Status 'Killing Node.js process(es)...' Warning
            $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            Disable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            Write-Status "Task '$TaskName' stopped and disabled" Success
        } else {
            Write-Status "Task '$TaskName' not found" Warning
        }
        Remove-Item -Path 'data/govnobot.lock' -Force -ErrorAction SilentlyContinue
        Write-Status 'GovnoBot stopped' Success
    }

    'start' {
        Write-Status "`nStarting GovnoBot Node.js (Task: $TaskName)..." Info
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Enable-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            Write-Status "Task '$TaskName' enabled and started" Success
        } else {
            Write-Status "Task '$TaskName' not found. Run 'install' first." Error
            exit 1
        }
    }

    'restart' {
        Write-Status "`nRestarting GovnoBot Node.js..." Info
        try {
            Write-Status 'Stopping existing GovnoBot...' Info
            & $PSCommandPath -Action stop -TaskName $TaskName
            Start-Sleep -Seconds 3
            Write-Status 'Starting GovnoBot...' Info
            & $PSCommandPath -Action start -TaskName $TaskName
            Write-Status 'GovnoBot restarted' Success
        } catch {
            Write-Status "ERROR: Restart failed - $_" Error
            exit 1
        }
    }

    'status' {
        Write-Status "`nGovnoBot Node.js Status:" Info
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($task) {
            Write-Status "  Task Name: $TaskName" Info
            Write-Status "  State: $($task.State)" Info
            Write-Status "  Enabled: $($task.Enabled)" Info
            $lastRun = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
            if ($lastRun) {
                Write-Status "  Last Run: $($lastRun.LastRunTime)" Info
                Write-Status "  Last Result: $($lastRun.LastTaskResult)" Info
                Write-Status "  Next Run: $($lastRun.NextRunTime)" Info
            }
        } else {
            Write-Status "  Task '$TaskName' NOT FOUND - Install it first" Error
        }
        $nodeProcs = Get-Process node -ErrorAction SilentlyContinue
        if ($nodeProcs) {
            Write-Status "  Node.js Process(es): Running (PID: $($nodeProcs.Id -join ', '))" Success
        } else {
            Write-Status '  Node.js Process(es): Not running' Warning
        }
    }

    'install' {
        Write-Status "`nInstalling GovnoBot Node.js Task Scheduler..." Info
        & .\scripts\install-windows-node-service.ps1 -UseTaskScheduler -Verbose
    }

    default {
        Write-Status "Unknown action: $Action" Error
        Write-Status 'Usage: govnobot-node.ps1 {start|stop|restart|status|install}' Info
        exit 1
    }
}
