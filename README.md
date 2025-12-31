# GovnoBot

A Telegram bot built with PowerShell that integrates with Ollama for AI-powered responses.

## Overview

GovnoBot is a Telegram chatbot that provides access to local AI models through Ollama integration. The bot is written in PowerShell and includes comprehensive deployment and management tools.

## Features

- **AI Integration**: Uses Ollama to run local language models (llama2, mistral, neural-chat, etc.)
- **Model Switching**: Dynamic model selection via `/model` command
- **Deployment Management**: Automated backup, status checking, and deployment capabilities
- **Telegram Integration**: Native Telegram bot API support
- **Configuration Management**: Persistent settings and chat history storage

## Files

- `govnobot.ps1` - Main bot script (latest version)
- `govnobot-2.2.x.ps1` - Version-specific releases
- `govnodeploy.ps1` - Deployment and management tool
- `govnoplan.md` - Development planning and roadmap

## Usage

### Starting the Bot

```powershell
.\govnodeploy.ps1 start -Instance govnobot -BotToken <YOUR_TOKEN>
```

### Checking Status

```powershell
.\govnodeploy.ps1 status -Instance govnobot
```

### Creating Backups

```powershell
.\govnodeploy.ps1 backup -Instance govnobot
```

## Environment Variables

- `TELEGRAM_GOVNOBOT_TOKEN` - Telegram bot API token
- `OLLAMA_URL` - Ollama server URL (default: http://localhost:11434)

## Requirements

- PowerShell 5.1 or higher
- Ollama running locally or accessible via network
- Valid Telegram Bot Token (obtain from BotFather)

## Data Directories

- `govnobot_data/` - Chat history and user settings
- `govnobot_logs/` - Deployment and runtime logs
- `govnobot_backups/` - Automated backup snapshots

## Troubleshooting

### Bot Won't Start

1. Verify bot token is set: `$env:TELEGRAM_GOVNOBOT_TOKEN`
2. Check Ollama connectivity: Test connection to configured URL
3. Review logs: `govnobot_logs/govnodeploy.log`

### PowerShell Syntax Errors

Some versions may have encoding issues with special characters. Verify the script was saved with UTF-8 encoding without BOM.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and changes.

## License

Internal project.
