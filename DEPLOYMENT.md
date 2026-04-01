# GovnoBot Deployment Guide

## Version 2.0.0 - Task Scheduler Edition

### Overview

The deployment system has been rewritten to use **Windows Task Scheduler** instead of PowerShell background jobs. The bot now runs with the `-NoLoop` flag, performing a single polling iteration per execution, with the scheduler handling repetitive execution.

### Key Benefits

✅ **Automatic Restart on Failure** - Built-in Windows recovery mechanisms  
✅ **Better Process Management** - Clean start/stop of each execution  
✅ **System Integration** - Native Windows monitoring and logging  
✅ **Resource Cleanup** - No lingering background processes  
✅ **Health Monitoring** - Continuous health checks with auto-recovery  

### Architecture (Windows)

```
Windows Task Scheduler
    ↓ (every 30s)
govnobot.ps1 -NoLoop
    ↓ (polls once)
Telegram API
    ↓ (processes updates)
Exit cleanly
    ↓ (wait for next trigger)
Repeat
```

#### Windows Node.js always-on service (NSSM + Task Scheduler)

For the Node.js edition (`govnobot.js` / `src/index.js`), use a Windows service wrapper (recommended: NSSM) or scheduled task with restart policy.

1. Install NSSM:
   - Download from https://nssm.cc/download
   - Extract `nssm.exe` to `C:\Windows\System32` or a directory in PATH.

2. Install GovnoBot service:
   ```powershell
   $botDir = "C:\path\to\govnobot"
   $node = (Get-Command node).Source
   $envFile = Join-Path $botDir ".env"

   nssm install GovnoBotNode \"$node\" \"$botDir\"\src\index.js
   nssm set GovnoBotNode AppDirectory $botDir
   nssm set GovnoBotNode AppStdout \"$botDir\\govnobot-node.log\"
   nssm set GovnoBotNode AppStderr \"$botDir\\govnobot-node.err.log\"
   nssm set GovnoBotNode Start SERVICE_AUTO_START
   nssm set GovnoBotNode AppEnvironmentExtra TELEGRAM_GOVNOBOT_TOKEN=%TELEGRAM_GOVNOBOT_TOKEN%
   nssm set GovnoBotNode AppEnvironmentExtra TELEGRAM_GOVNOBOT_ADMIN_CHATID=%TELEGRAM_GOVNOBOT_ADMIN_CHATID%
   nssm set GovnoBotNode AppEnvironmentExtra TELEGRAM_GOVNOBOT_ADMIN_USERNAME=%TELEGRAM_GOVNOBOT_ADMIN_USERNAME%
   nssm set GovnoBotNode AppEnvironmentExtra NODE_ENV=production
   nssm set GovnoBotNode AppRestartDelay 5000
   nssm set GovnoBotNode AppRotateFiles 1
   nssm set GovnoBotNode AppRotateOnline 1
   nssm set GovnoBotNode AppRotateSeconds 604800
   nssm set GovnoBotNode AppExit 1
   nssm set GovnoBotNode AppRestart 1
   nssm set GovnoBotNode AppThrottle 1500
   nssm set GovnoBotNode AppWow64 1

   nssm start GovnoBotNode
   ```

3. Alternative (Task Scheduler + node):
   ```powershell
   $action = New-ScheduledTaskAction -Execute "$(Get-Command node).Source" -Argument "`"$botDir\\src\\index.js`""
   $trigger = New-ScheduledTaskTrigger -AtStartup -RepetitionInterval (New-TimeSpan -Seconds 30) -RepeatIndefinitely
   $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest
   Register-ScheduledTask -TaskName "GovnoBotNode" -Action $action -Trigger $trigger -Principal $principal -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Seconds 10))
   Start-ScheduledTask -TaskName "GovnoBotNode"
   ```

4. Verify:
   - `nssm status GovnoBotNode` (or Task Scheduler UI)
   - `Get-EventLog -LogName Application -Newest 20 | where {$_.Source -eq 'nssm'}`
   - Validate bot in Telegram: `/status` command, `/version` command.

---

### Architecture (Linux/macOS with systemd)

```
systemd timer + service
    ↓ (on boot + restart on failure)
node src/index.js
    ↓ (runs continuously)
Telegram API
    ↓ (processes updates)
Restart on failure with exponential backoff
```

This repository includes a Systemd template unit: `systemd/govnobot@.service`.

Use the template for always-on persistence on Linux systems.

Each execution:
1. Polls Telegram API once
2. Processes all pending updates
3. Exits cleanly
4. Scheduler triggers next run automatically

### Requirements

- **Administrator privileges** required for task management
- Windows Task Scheduler (built into Windows)
- PowerShell 5.1 or higher

### Quick Start

1. **Deploy versioned bot script:**
   ```powershell
   .\govnodeploy.ps1 deploy
   ```

2. **Start bot (creates scheduled task):**
   ```powershell
   .\govnodeploy.ps1 start -BotToken "YOUR_TOKEN_HERE"
   ```

3. **Check status:**
   ```powershell
   .\govnodeploy.ps1 status
   ```

4. **Monitor health (optional):**
   ```powershell
   .\govnodeploy.ps1 monitor
   ```

### Commands

| Command | Description | Admin Required |
|---------|-------------|----------------|
| `start` | Create and start scheduled task | ✅ Yes |
| `stop` | Stop the scheduled task | ✅ Yes |
| `restart` | Restart the scheduled task | ✅ Yes |
| `status` | View task status and health | ❌ No |
| `monitor` | Continuous health monitoring with auto-restart | ❌ No |
| `update` | Update to new bot version | ✅ Yes |
| `backup` | Backup bot data | ❌ No |
| `logs` | View recent logs | ❌ No |
| `deploy` | Deploy current govnobot.ps1 as versioned file | ❌ No |
| `uninstall` | Remove scheduled task | ✅ Yes |

### Configuration Options

```powershell
-BotToken <string>       # Telegram bot token (or use TELEGRAM_GOVNOBOT_TOKEN env var)
-Version <string>        # Bot version (default: 2.4.7)
-InstanceName <string>   # Instance name (default: govnobot)
-TaskName <string>       # Custom task name
-PollInterval <int>      # Seconds between polls (default: 30)
-NoLamma                 # Run without local Ollama
-DebugMode               # Enable debug logging
-LogPath <string>        # Custom log path
-BackupPath <string>     # Custom backup path
```

### Examples

**Basic start:**
```powershell
.\govnodeploy.ps1 start -BotToken "5995329297:AAGxxxxxxxx"
```

**Custom poll interval:**
```powershell
.\govnodeploy.ps1 start -BotToken "5995329297:AAGxxxxxxxx" -PollInterval 15
```

**Without Ollama:**
```powershell
.\govnodeploy.ps1 start -BotToken "5995329297:AAGxxxxxxxx" -NoLamma
```

**Monitor mode (continuous health checks):**
```powershell
.\govnodeploy.ps1 monitor
```

**Update to new version:**
```powershell
.\govnodeploy.ps1 update -Version 2.5.0
```

**Complete removal:**
```powershell
.\govnodeploy.ps1 stop
.\govnodeploy.ps1 uninstall
```

### Monitoring

The `monitor` command provides continuous health monitoring:
- Checks task status every 60 seconds
- Tracks consecutive failures
- Automatically restarts task after 3 consecutive failures
- Logs all state changes

```powershell
# Start monitoring (press Ctrl+C to stop)
.\govnodeploy.ps1 monitor
```

### Troubleshooting

**Task won't start:**
- Ensure you're running PowerShell as Administrator
- Check bot token is valid
- Verify bot script exists: `govnobot-X.X.X.ps1`

**Bot not responding:**
```powershell
# Check task status
.\govnodeploy.ps1 status

# View logs
.\govnodeploy.ps1 logs

# Restart task
.\govnodeploy.ps1 restart -BotToken "YOUR_TOKEN"
```

**View task in Task Scheduler:**
1. Open Task Scheduler (taskschd.msc)
2. Find task: `GovnoBot-govnobot` (or your custom name)
3. Right-click → Properties to view configuration
4. Check "History" tab for execution details

**Permission issues:**
```powershell
# Run as Administrator
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit", "-File", ".\govnodeploy.ps1", "start", "-BotToken", "YOUR_TOKEN"
```

### File Structure

```
govnobot/
├── govnobot.ps1                    # Main bot script (source)
├── govnobot-2.4.7.ps1              # Versioned bot script (deployed)
├── govnodeploy.ps1                 # This deployment manager
├── govnobot_data/                  # Bot data and state
├── govnobot_logs/                  # Log files
│   └── govnodeploy.log
└── govnobot_backups/               # Automatic backups
    └── backup_YYYY-MM-DD_HHMMSS/
```

### Migration from v1.0.0

If upgrading from the PowerShell job-based version:

1. **Stop old bot:**
   ```powershell
   Get-Job | Where-Object { $_.Name -like "*govnobot*" } | Stop-Job
   Get-Job | Where-Object { $_.Name -like "*govnobot*" } | Remove-Job
   ```

2. **Deploy new version:**
   ```powershell
   .\govnodeploy.ps1 deploy
   ```

3. **Start with Task Scheduler:**
   ```powershell
   .\govnodeploy.ps1 start -BotToken "YOUR_TOKEN"
   ```

### Security Notes

- Task runs under your user account (not SYSTEM)
- Bot token should be protected (use environment variable)
- Admin commands in bot are restricted by user ID
- Scheduled task requires "Run with highest privileges" for full functionality

### Performance

- **Memory footprint:** ~50-80MB per execution
- **CPU usage:** Minimal (only during active polling)
- **Startup time:** ~2-3 seconds per iteration
- **Recommended poll interval:** 60-120 seconds (minimum 60 supported)

Shorter intervals = faster response time but higher resource usage  
Longer intervals = lower resource usage but slower response time

### Advanced Usage

**Multiple instances:**
```powershell
# Instance 1
.\govnodeploy.ps1 start -InstanceName "prod" -TaskName "GovnoBot-Prod" -BotToken "TOKEN1"

# Instance 2
.\govnodeploy.ps1 start -InstanceName "dev" -TaskName "GovnoBot-Dev" -BotToken "TOKEN2"
```

**Custom logging:**
```powershell
.\govnodeploy.ps1 start -BotToken "TOKEN" -LogPath "C:\Logs\govnobot\bot.log"
```

**Backup before update:**
```powershell
.\govnodeploy.ps1 backup
.\govnodeploy.ps1 update -Version 2.5.0
```

---

**Version:** 2.0.0  
**Date:** 2026-01-08  
**Author:** GovnoBot Development Team
