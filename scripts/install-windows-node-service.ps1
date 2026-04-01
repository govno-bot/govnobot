<#
Script: scripts/install-windows-node-service.ps1
Purpose: install/uninstall GovnoBot as always-on Windows service using NSSM.
#>
param(
    [string]$InstallDir = "$PSScriptRoot\..",
    [string]$ServiceName = 'GovnoBotNode',
    [string]$NodeExe = (Get-Command node).Source,
    [switch]$UseTaskScheduler,
    [switch]$Uninstall
)

if (-not (Test-Path $NodeExe)) {
    Write-Error "Node executable not found in PATH. Install Node.js or set PATH correctly."
    exit 1
}

$installDirFull = Resolve-Path $InstallDir
$botScript = Join-Path $installDirFull 'src\index.js'
if (-not (Test-Path $botScript)) {
    Write-Error "Bot script not found: $botScript"
    exit 1
}

$envFile = Join-Path $installDirFull '.env'

$adminCheck = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $adminCheck.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Administrator privileges are required. Run PowerShell as Administrator and re-run this script."
    exit 1
}

# Load environment variables from .env if it exists
function Load-EnvFile {
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' }
        foreach ($line in $envContent) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $name = $parts[0].Trim()
                $value = $parts[1].Trim()
                Set-Item -Path "Env:$name" -Value $value -Force
            }
        }
        Write-Host "[OK] Loaded environment variables from .env"
    }
}

Load-EnvFile


function Register-WindowsTask {
    $taskName = $ServiceName

    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    # Create a wrapper batch file that loads .env and calls node.
    # This ensures environment variables are available in the scheduled task context.
    $wrapperBatch = Join-Path $installDirFull "run-govnobot.bat"
    
    # Build batch file content as an array of strings (with strict quoting)
    $batchLines = @(
        '@echo off',
        'setlocal enabledelayedexpansion',
        'cd /d "' + $installDirFull + '"',
        '',
        'REM Load .env file if it exists',
        'if exist ".env" (',
        '  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (',
        '    if not "%%A"=="" if not "%%A:~0,1%"=="#" (',
        '      set "%%A=%%B"',
        '    )',
        '  )',
        ')',
        '',
        'REM Run Node.js with the bot script',
        '"' + $NodeExe + '" "' + $botScript + '"'
    )

    $batchContent = $batchLines -join [System.Environment]::NewLine
    Set-Content -Path $wrapperBatch -Value $batchContent -Encoding ASCII
    Write-Host "Created wrapper batch: $wrapperBatch"

    # Use schtasks to create a task with 1-minute repetition.
    # 
    # Avoid the need for user password by running as SYSTEM.
    $schtaskCmd = "schtasks /create /tn `"$taskName`" /tr `"$wrapperBatch`" /sc MINUTE /mo 1 /ru SYSTEM /rl HIGHEST /f"
    
    Write-Host "Creating scheduled task with command: $schtaskCmd"
    $createOutput = cmd.exe /c $schtaskCmd 2>&1
    Write-Host $createOutput
    if ($LastExitCode -ne 0) {
        Write-Error "schtasks failed with exit code $LastExitCode"
        Write-Error $createOutput
    }
    
    # Verify task was created
    Start-Sleep -Milliseconds 500
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Write-Host "Scheduled task '$taskName' created successfully."
        Write-Host "  Trigger: Every 1 minute"
        Write-Host "  Wrapper: $wrapperBatch"
        Write-Host "  WorkingDirectory: $installDirFull"
        Write-Host ""
        Write-Host "Verify bot is running:"
        Write-Host "  Send /status or /version to the bot on Telegram"
    } else {
        Write-Error "Failed to create scheduled task."
        exit 1
    }
}

function Get-NssmPath {
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm) { return $nssm.Source }

    $candidate = 'C:\Windows\System32\nssm.exe'
    if (Test-Path $candidate) { return $candidate }

    return $null
}

function Install-NssmWithChocolatey {
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if (-not $choco) {
        return $false
    }

    Write-Host "Trying to install NSSM via Chocolatey..."
    try {
        & $choco install nssm -y
    } catch {
        Write-Warning "Chocolatey install failed: $_"
        return $false
    }

    Start-Sleep -Seconds 2
    return Get-NssmPath
}

$nssm = Get-NssmPath
if (-not $nssm -and -not $UseTaskScheduler) {
    $nssm = Install-NssmWithChocolatey
    if ($nssm) {
        Write-Host "NSSM installed successfully: $nssm"
    }
}

if (-not $nssm -and -not $UseTaskScheduler) {
    Write-Warning "NSSM not found. Falling back to Task Scheduler as a service alternative."
    $UseTaskScheduler = $true
}

if ($UseTaskScheduler) {
    if ($Uninstall) {
        if (Get-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false
            Write-Host "Scheduled task $ServiceName removed."
        } else {
            Write-Host "No scheduled task named $ServiceName was found."
        }
        exit 0
    }

    Register-WindowsTask
    exit 0
}

if ($Uninstall) {
    & $nssm remove $ServiceName confirm
    Write-Host "Service $ServiceName removed (if existed)."
    exit 0
}

& $nssm install $ServiceName $NodeExe $botScript
& $nssm set $ServiceName AppDirectory $installDirFull
& $nssm set $ServiceName AppStdout (Join-Path $installDirFull 'govnobot-node.log')
& $nssm set $ServiceName AppStderr (Join-Path $installDirFull 'govnobot-node.err.log')
& $nssm set $ServiceName AppRestartDelay 5000
& $nssm set $ServiceName AppEnvironmentExtra "NODE_ENV=production"

# Optional: pass existing env vars (if set) so service has access.
$map = @{
    'TELEGRAM_GOVNOBOT_TOKEN' = $env:TELEGRAM_GOVNOBOT_TOKEN
    'TELEGRAM_GOVNOBOT_ADMIN_CHATID' = $env:TELEGRAM_GOVNOBOT_ADMIN_CHATID
    'TELEGRAM_GOVNOBOT_ADMIN_USERNAME' = $env:TELEGRAM_GOVNOBOT_ADMIN_USERNAME
}
foreach ($k in $map.Keys) {
    if ($map[$k]) {
        & $nssm set $ServiceName AppEnvironmentExtra "$k=$($map[$k])"
    }
}

& $nssm set $ServiceName Start SERVICE_AUTO_START
& $nssm start $ServiceName

Write-Host "Installed and started service $ServiceName. Check with: nssm status $ServiceName"