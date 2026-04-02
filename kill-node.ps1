# Kill node processes and restart bot - requires Admin
param(
    [switch]$Restart
)

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script requires Administrator privileges. Please run PowerShell as Administrator." -ErrorAction Stop
}

Write-Host "🔥 Killing all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Terminating PID $($_.Id)..."
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

if ($Restart) {
    Write-Host "`n🚀 Restarting govnobot..." -ForegroundColor Green
    Remove-Item -Path "data/govnobot.lock" -ErrorAction SilentlyContinue
    & node src/index.js
}
