# --------------------------------------------------------------------------
# Script: Force-StayAwake-Final.ps1 (RUN AS ADMIN)
# --------------------------------------------------------------------------

# 1. Admin Check
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Please run as Administrator!" -ErrorAction Stop
}

# 2. Dynamically find the active scheme
$active = (powercfg /getactivescheme).Split(' ')[3]

# 3. Force Unhide the entire 'Buttons' and 'Sleep' subgroups
Write-Host "[CMD] powercfg /attributes SUB_BUTTONS -ATTRIB_HIDE" -ForegroundColor Gray
powercfg /attributes SUB_BUTTONS -ATTRIB_HIDE
Write-Host "[CMD] powercfg /attributes SUB_SLEEP -ATTRIB_HIDE" -ForegroundColor Gray
powercfg /attributes SUB_SLEEP -ATTRIB_HIDE

# 4. Use the ALIASES instead of GUIDs (more compatible with Modern Standby)
Write-Host "Applying hardware overrides to scheme: $active" -ForegroundColor Cyan

# LIDACTION: 0=Do Nothing, 1=Sleep, 2=Hibernate, 3=Shutdown
Write-Host "[CMD] powercfg /setacvalueindex `$active SUB_BUTTONS LIDACTION 0" -ForegroundColor Gray
powercfg /setacvalueindex $active SUB_BUTTONS LIDACTION 0
Write-Host "[CMD] powercfg /setdcvalueindex `$active SUB_BUTTONS LIDACTION 0" -ForegroundColor Gray
powercfg /setdcvalueindex $active SUB_BUTTONS LIDACTION 0

# HIBERNATEIDLE: 0=Never (SLEEPIDLE skipped - not available on all systems)
Write-Host "[CMD] powercfg /setacvalueindex `$active SUB_SLEEP HIBERNATEIDLE 0" -ForegroundColor Gray
powercfg /setacvalueindex $active SUB_SLEEP HIBERNATEIDLE 0 2>$null
Write-Host "[CMD] powercfg /setdcvalueindex `$active SUB_SLEEP HIBERNATEIDLE 0" -ForegroundColor Gray
powercfg /setdcvalueindex $active SUB_SLEEP HIBERNATEIDLE 0 2>$null

# COMMIT
Write-Host "[CMD] powercfg /setactive `$active" -ForegroundColor Gray
powercfg /setactive $active

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ OVERRIDE COMPLETE: Power settings applied successfully." -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Some settings may not have applied. Exit code: $LASTEXITCODE" -ForegroundColor Yellow
}

# 6. VERIFICATION (Look for '0x00000000' in the output)
Write-Host "`nVerification Check (Lid Action):" -ForegroundColor Yellow
Write-Host "[CMD] powercfg /q `$active SUB_BUTTONS LIDACTION" -ForegroundColor Gray
powercfg /q $active SUB_BUTTONS LIDACTION