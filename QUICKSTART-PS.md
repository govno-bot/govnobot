# GovnoBot PowerShell - Quick Start Guide (v2.0.0)

## ✅ What Was Fixed

- **Task Scheduler Integration:** Sub-minute interval support via XML
- **Path Resolution:** Fixed empty backup path causing install failures  
- **Error Handling:** Better admin privilege detection and error messages

## Prerequisites

1. **Windows PowerShell 5.1+**
2. **Administrator privileges** (for Task Scheduler operations)
3. **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

## Quick Start (3 Commands)

### 1. Deploy Versioned Script
```powershell
.\govnodeploy.ps1 deploy
```
✅ Creates `govnobot-2.4.7.ps1` from `govnobot.ps1`

### 2. Initialize Directories
```powershell
.\govnodeploy.ps1 install
```
✅ Creates `govnobot_data/`, `govnobot_logs/`, `govnobot_backups/`

### 3. Start Bot (Run as Administrator!)
```powershell
# Right-click PowerShell → "Run as Administrator"
.\govnodeploy.ps1 start -BotToken "YOUR_TELEGRAM_BOT_TOKEN"
```
✅ Creates Windows scheduled task that runs every 60 seconds

## Verify It's Working

```powershell
.\govnodeploy.ps1 status
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║                    GovnoBot Task Status                        ║
╠════════════════════════════════════════════════════════════════╣
  Task Name:        GovnoBot
  State:            Ready  [Green]
  Last Run:         2026-01-08 11:50:00
  Last Result:      0  [Green]
  Next Run:         2026-01-08 11:50:30
```

## Essential Commands

```powershell
# Check bot health
.\govnodeploy.ps1 status

# Stop bot (requires admin)
.\govnodeploy.ps1 stop

# Restart bot (requires admin)
.\govnodeploy.ps1 restart -BotToken "YOUR_TOKEN"

# Watch health continuously (auto-restart on failure)
.\govnodeploy.ps1 monitor

# View recent logs
.\govnodeploy.ps1 logs

# Create backup
.\govnodeploy.ps1 backup

# Remove task completely (requires admin)
.\govnodeploy.ps1 uninstall
```

## Configuration Options

### Custom Poll Interval
```powershell
# Default (60 seconds)
.\govnodeploy.ps1 start -BotToken "TOKEN"

# Slower polling (120 seconds) - saves resources
.\govnodeploy.ps1 start -BotToken "TOKEN" -PollInterval 120
```

**Note:** Windows Task Scheduler requires a minimum interval of 60 seconds. Values below 60 will be automatically adjusted to 60.

### Without Local Ollama (Use Cloud AI)
```powershell
.\govnodeploy.ps1 start -BotToken "TOKEN" -NoLamma
```

### Debug Mode (Verbose Logging)
```powershell
.\govnodeploy.ps1 start -BotToken "TOKEN" -DebugMode
```

### Multiple Instances
```powershell
# Production bot
.\govnodeploy.ps1 start -TaskName "GovnoBot-Prod" -BotToken "TOKEN1" -PollInterval 30

# Development bot  
.\govnodeploy.ps1 start -TaskName "GovnoBot-Dev" -BotToken "TOKEN2" -PollInterval 60
```

## How It Works

The bot uses **Windows Task Scheduler** with the `-NoLoop` flag:

```
Task Scheduler (every 30s)
  ↓
govnobot-2.4.7.ps1 -NoLoop
  ↓
Poll Telegram API once
  ↓
Process all updates
  ↓
Exit cleanly
  ↓
Task Scheduler triggers again
```

**Benefits:**
- ✅ Auto-restart on crash
- ✅ Clean resource cleanup
- ✅ System-level monitoring
- ✅ No orphaned processes

## Monitoring (Recommended)

Keep a PowerShell window running:
```powershell
.\govnodeploy.ps1 monitor
```

This will:
- Check task health every 60 seconds
- Auto-restart after 3 consecutive failures
- Display real-time status updates
- Press `Ctrl+C` to stop

## Troubleshooting

### "Administrator privileges required"
Solution: Right-click PowerShell → "Run as Administrator"

### "Task XML contains a value which is incorrectly formatted"
This is **FIXED in v2.0.0**. If you still see it:
1. Pull latest version
2. Try: `.\govnodeploy.ps1 start -BotToken "TOKEN" -PollInterval 60`

### "Cannot bind argument to parameter 'Path'"
This is **FIXED in v2.0.0**. The backup path is now properly initialized.

### Task shows as "Ready" but never runs
```powershell
# Check task details
Get-ScheduledTask -TaskName "GovnoBot" | Get-ScheduledTaskInfo

# Manually trigger task
Start-ScheduledTask -TaskName "GovnoBot"

# Check logs
.\govnodeploy.ps1 logs
```

### Bot not responding to commands
```powershell
# View status
.\govnodeploy.ps1 status

# Check logs
.\govnodeploy.ps1 logs

# Restart
.\govnodeploy.ps1 restart -BotToken "TOKEN"
```

## View in Task Scheduler GUI

1. Press `Win+R`
2. Type: `taskschd.msc`
3. Press Enter
4. Find task: `GovnoBot`
5. Right-click → Properties to view settings
6. Check "History" tab for execution log

## Updating Bot

```powershell
# 1. Edit govnobot.ps1, change version number
# 2. Deploy new version
.\govnodeploy.ps1 deploy

# 3. Backup current data
.\govnodeploy.ps1 backup

# 4. Update to new version
.\govnodeploy.ps1 update -Version 2.5.0

# 5. Start new version
.\govnodeploy.ps1 start -BotToken "TOKEN"
```

## Complete Uninstall

```powershell
# Stop and remove task
.\govnodeploy.ps1 stop
.\govnodeploy.ps1 uninstall

# Optional: Remove all data
Remove-Item -Recurse -Force govnobot_data
Remove-Item -Recurse -Force govnobot_logs  
Remove-Item -Recurse -Force govnobot_backups
```

## Performance Tuning

**High-traffic bots:**
- Poll interval: 60 seconds (minimum)
- Enable monitoring: `.\govnodeploy.ps1 monitor`

**Low-traffic bots:**
- Poll interval: 120-300 seconds
- No monitoring needed

**Resource usage per execution:**
- RAM: ~50-80 MB
- CPU: <5% (during active polling)
- Disk: Minimal (logs only)

## Environment Variable (Alternative)

Instead of `-BotToken` parameter:
```powershell
# Set once
$env:TELEGRAM_GOVNOBOT_TOKEN = "YOUR_TOKEN_HERE"

# Then just:
.\govnodeploy.ps1 start
.\govnodeploy.ps1 restart
```

Or set permanently:
```powershell
[System.Environment]::SetEnvironmentVariable('TELEGRAM_GOVNOBOT_TOKEN', 'YOUR_TOKEN', 'User')
```

## Files Structure

```
govnobot/
├── govnobot.ps1              # Source bot script
├── govnobot-2.4.7.ps1        # Deployed versioned script
├── govnodeploy.ps1           # This deployment manager (v2.0.0)
├── DEPLOYMENT.md             # Detailed documentation
├── QUICKSTART-PS.md          # This file
├── govnobot_data/            # Bot state and data
├── govnobot_logs/            # Deployment and bot logs
│   └── govnodeploy.log
└── govnobot_backups/         # Automatic backups (last 5)
    └── backup_2026-01-08_114500/
```

## Testing Without Real Bot

```powershell
# Test task creation (will fail to connect, expected)
.\govnodeploy.ps1 start -BotToken "test_token_123"

# Verify task was created
.\govnodeploy.ps1 status

# Clean up
.\govnodeploy.ps1 uninstall
```

## Need More Help?

- **Full documentation:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Bot commands:** Run bot and send `/help` in Telegram
- **Task Scheduler GUI:** `taskschd.msc`
- **Event logs:** Event Viewer → Task Scheduler logs

---

**Version:** 2.0.0 (Task Scheduler Edition)  
**Date:** 2026-01-08  
**Platform:** Windows PowerShell 5.1+
