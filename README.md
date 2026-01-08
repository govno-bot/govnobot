# GovnoBot

A Telegram AI bot with Ollama integration - now being rewritten in Node.js!

## Overview

GovnoBot is a Telegram chatbot that provides access to local AI models through Ollama integration. Originally written in PowerShell, it's being rewritten in **pure Node.js** (zero external dependencies) following TDD/BDD/ADD methodology for better cross-platform support and maintainability.

## 🚀 Node.js Rewrite (In Progress)

The Node.js version is currently under development following a test-driven approach. See [govnoplan.node.md](govnoplan.node.md) for the complete development plan.

### Current Status

✅ Phase 1.1: Test infrastructure setup  
🔄 Phase 1.2: Core utility modules (chunker, logger, file-lock)  
⏳ Phase 2: Storage & persistence  
⏳ Phase 3-8: Security, Telegram API, AI integration, commands

### Quick Start (Node.js Version)

```bash
# 1. Bootstrap the project structure
node init.js
# Creates directories, organizes files, runs tests

# 2. Run the demo to see it working
node demo.js
# Shows chunker and config modules in action

# 3. Check current status
npm run status
# Visual overview of progress

# 4. Run tests
npm test
# 20 tests should pass ✅

# 5. Configure your bot (when ready)
cp .env.example .env
# Edit .env with your Telegram bot token
```

### What's Been Implemented?

**✅ Phase 1.1 Complete - Test Infrastructure:**
- Custom test runner (zero dependencies!)
- Message chunker (4096 char limit handling)
- Configuration module (.env parser)
- 20 passing tests (100% TDD coverage)
- Complete project scaffolding
- 8 documentation files

**🔄 Phase 1.2 Next - Core Utilities:**
- Logger module (structured logging)
- File lock module (concurrent access)
- Error handler (graceful recovery)

See [INDEX.md](INDEX.md) for complete overview and [TODO.md](TODO.md) for roadmap.

## PowerShell Version (Legacy)

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
