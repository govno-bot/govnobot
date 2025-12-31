# GovnoBot Development Plan
**Last Updated**: 2025-12-31  
**Current Version**: 2.2.5  
**Status**: Active Development

---

## Executive Summary

GovnoBot is a **Telegram bot for "ultimate vibecoding experience"** - an experimental AI-powered assistant with multi-tier fallback architecture. The bot integrates local AI (Ollama), GitHub Copilot CLI, GitHub agent-task, OpenAI API, and automation scripts to provide conversational AI, code assistance, debugging, and system automation through Telegram.

### Key Characteristics
- **Experimental nature**: Rapid iteration, daily versioning (v2.0.0 → v2.2.5 on 2025-12-31)
- **Multi-tier AI fallback**: Ollama → GitHub agent-task → Copilot CLI → OpenAI API
- **Conversational memory**: Per-user history with persistence (in-memory + file-based)
- **Admin-controlled**: Restricted commands with username/chat_id validation
- **Integration hub**: Facebook Messenger bridge (`/jack`), shell execution (`/sh`), system automation

---

## Current Architecture

### Core Components

#### 1. Main Bot Script (`govnobot.ps1` / `govnobot-2.2.5.ps1`)
**Size**: 1384 lines  
**Features**:
- Telegram Bot API polling (30s interval, exponential backoff)
- Conversation history per user (max 100 entries, persisted to JSON)
- User settings storage (custom prompts, model selection)
- Response caching to reduce API calls
- Rate limiting (10 req/min, 100 req/hour per user)
- Message chunking for Telegram's 4096 char limit
- Statistics tracking (total prompts, commands, uptime)

#### 2. Deployment Script (`govnodeploy.ps1`)
**Size**: 597 lines  
**Features**:
- Actions: `start`, `stop`, `restart`, `status`, `update`, `backup`, `logs`, `install`, `deploy`
- Automatic backup management (keeps last 5 backups)
- Versioned script deployment (copies `govnobot.ps1` → `govnobot-X.Y.Z.ps1`)
- PowerShell background job management
- Log rotation and colored output

#### 3. Supporting Scripts
- **`sendMessageToJack.ps1`**: Automates Facebook Messenger via Chrome SendKeys
- **Version-specific snapshots**: `govnobot-2.2.2.ps1` through `2.2.5.ps1` (historical versions)
- **`govnobot.ps1.bak`**: Manual backup of working configuration

### Data Structure

```
govnobot_data/
  ├── history/            # Per-user conversation logs (JSON)
  │   └── {chat_id}.json  # @{timestamp, role, content}[]
  ├── settings/           # Per-user preferences (JSON)
  │   └── {chat_id}.json  # @{model, systemPrompt, maxHistoryContext}
  └── cache/              # Response caching (unused in current implementation)

govnobot_logs/
  └── govnodeploy.log     # Deployment script logs

govnobot_backups/
  └── backup_YYYY-MM-DD_HHmmss/  # Timestamped full data backups
      └── [govnobot_data copy]
```

---

## Command Reference

### Public Commands
| Command | Description | History Integration |
|---------|-------------|---------------------|
| `/start` | Welcome message with bot info | No |
| `/help` | Detailed usage guide | No |
| `/ask <question>` | Ask AI (with conversation context) | ✅ Yes |
| `/fix <error/code>` | Debug/troubleshoot issues | ✅ Yes |
| `/chain <step1 \| step2...>` | Multi-step AI pipeline | No |
| `/ping` | Bot responsiveness test | No |
| `/time` | Current server time | No |
| `/stats` | Bot usage statistics | No |
| `/status` | Bot health check (Ollama connection) | No |
| `/version` | Version information | No |
| `/history [n]` | Show last n messages (default: 5) | N/A |
| `/model [name]` | Switch AI model (llama2, mistral, etc.) | No |
| `/settings` | View/modify user preferences | No |

### Admin-Only Commands (Username + Chat ID validation)
| Command | Description | Risk Level |
|---------|-------------|------------|
| `/agent <task>` | Complex multi-step task execution | High |
| `/sh <command>` | Execute PowerShell commands | **Critical** |
| `/jack <message>` | Send message via Facebook Messenger | Medium |
| `/dev` | Self-improvement mode (unclear implementation) | Unknown |

### Admin Validation Logic
```powershell
function RestrictToAdmin {
    if ($BotAdminUserName -eq $username -and $BotAdminChatId -eq $chatId) {
        return $true
    }
    # Deny and log
}
```
**Security Issue**: Only checks environment variables, no role-based access control.

---

## Version History & Evolution

### v2.2.5 (2025-12-31) - Current
✅ Fixed `govnodeploy.ps1` path resolution issues  
✅ Improved script root detection with `$PSScriptRoot` fallback  
✅ Added absolute path conversion for logs/backups  
✅ Enhanced null safety for path parameters  
✅ Created feedback improvement document

### v2.2.4 (2025-12-31)
✅ Code refactoring and optimization  
✅ Improved error handling and logging  
✅ Performance improvements  
✅ Documentation updates

### v2.2.3 (2025-12-31)
✅ Added `/jack` command for Facebook Messenger integration  
✅ Integrated `sendMessageToJack.ps1` automation  
✅ Fixed `/ask` command `enhancentPrompt` issue  
✅ Environment variable renaming

### v2.2.2 (2025-12-31)
✅ Added GitHub agent-task command support (primary AI fallback)  
✅ Updated fallback chain: agent-task → Copilot CLI → OpenAI API → Ollama  
✅ Better integration with GitHub's preview agent capabilities  
✅ Improved error handling for GitHub CLI operations

### v2.2.1 (2025-12-31)
✅ Updated to GitHub Copilot CLI (deprecated `gh copilot` extension removed)  
✅ Added fallback chain: copilot CLI → legacy gh-copilot → OpenAI API → Ollama  
✅ Improved error messages with installation links  
✅ Better detection of copilot command availability

### v2.2.0 (2025-12-31)
✅ Added conversation history per user (in-memory + file persistence)  
✅ Implemented custom system prompts per user (`/settings`)  
✅ Added `/history` command  
✅ Implemented response caching  
✅ Added `/model` command  
✅ Integrated conversation context into `/ask` and `/fix`

### v2.1.0 (2025-12-31)
✅ Enhanced NoLamma mode with multi-tier AI fallback  
✅ Added GitHub Copilot CLI integration  
✅ Added OpenAI API integration  
✅ Created `Invoke-AI-Fallback` helper function

### v2.0.0 (2025-12-31)
✅ Implemented `/fix` command  
✅ Implemented `/agent` command  
✅ Real-time statistics tracking  
✅ Admin security with AdminUsers list  
✅ Message chunking  
✅ Enhanced error handling  
✅ `/ping`, `/status`, `/version` commands  
✅ Ollama connection test at startup

**Key Observation**: All versions dated 2025-12-31 indicate **intensive single-day development sprint**.

---

## AI Integration Architecture

### Multi-Tier Fallback System

```
┌─────────────────────────────────────────────────────┐
│ User Request (/ask, /fix, /agent)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  NoLamma Mode? │ ──No──► Try Ollama Local
         └───────┬───────┘          (http://localhost:11434)
                 │ Yes                     │
                 ▼                         │ FAIL
      ┌──────────────────┐                │
      │ GitHub agent-task│◄───────────────┘
      │  (Primary Fallback)│
      └────────┬─────────┘
               │ FAIL
               ▼
      ┌──────────────────┐
      │ GitHub Copilot CLI│
      │  (gh copilot)     │
      └────────┬─────────┘
               │ FAIL
               ▼
      ┌──────────────────┐
      │  OpenAI API      │
      │  (Requires Key)  │
      └────────┬─────────┘
               │ FAIL
               ▼
      ┌──────────────────┐
      │  Return Error    │
      │  with Setup Help │
      └──────────────────┘
```

### Ollama Configuration
```powershell
$script:OllamaUrl = "http://localhost:11434/api/generate"
$script:OllamaModel = "llama2"
$script:AvailableModels = @("llama2", "mistral", "neural-chat", "dolphin-mixtral")
```
**Note**: Comment indicates MacBook IP address can be used for remote Ollama.

### Conversation Context Integration
When user sends `/ask` or `/fix`:
1. Load last `maxHistoryContext` messages (default: 5)
2. Retrieve user's custom system prompt (or default: "You are a helpful assistant.")
3. Format prompt with history: `"Previous context:\n[history]\n\nNew question: [user_input]"`
4. Send to AI fallback chain
5. Save response to history

---

## Known Issues & Technical Debt

### Critical Issues
1. **Security**:
   - `/sh` command allows arbitrary PowerShell execution (admin-only but risky)
   - No rate limiting enforcement in deployment script
   - Admin validation only checks environment variables (no dynamic user management)
   - No audit logging for admin commands

2. **Reliability**:
   - `govnodeploy start` uses PowerShell background jobs (not production-grade)
   - No health monitoring or auto-restart on crash
   - No graceful shutdown handling
   - Last command exit code: 1 (deployment script failed)

3. **Data Persistence**:
   - In-memory cache can be lost on crash
   - No database - all data in JSON files
   - No data validation or corruption detection
   - Race conditions possible with concurrent writes

### Medium Priority Issues
4. **Code Quality**:
   - 1384-line monolithic script (hard to maintain)
   - Inconsistent error handling patterns
   - No unit tests
   - Functions like `Invoke-AI-Fallback` span 30+ lines

5. **Performance**:
   - 30s polling interval (wasteful for low-traffic bot)
   - No connection pooling for Telegram API
   - Synchronous message handling (one update at a time)
   - Response caching not fully implemented

6. **Documentation**:
   - `/dev` command purpose unclear
   - No API documentation for functions
   - Changelog embedded in script (should be separate)
   - No deployment guide for production

### Low Priority Issues
7. **Features**:
   - Response caching directory exists but unused
   - `/chain` command doesn't use history
   - No webhook support (polling only)
   - No inline queries or callback buttons for most commands

---

## Development Roadmap

### Phase 1: Stabilization (Priority: HIGH)
**Goal**: Make existing features production-ready

#### 1.1 Fix Deployment Script Issues
- ✅ **DONE**: Path resolution issues in v2.2.5
- [ ] Investigate exit code 1 failure (see terminal context)
- [ ] Replace PowerShell jobs with Windows Service or nssm
- [ ] Add process monitoring and auto-restart
- [ ] Implement graceful shutdown (catch Ctrl+C)

#### 1.2 Security Hardening
- [ ] Add audit log for all admin commands (`admin_audit.log`)
- [ ] Implement IP whitelist for `/sh` command
- [ ] Add confirmation prompt for destructive operations
- [ ] Encrypt sensitive data in `settings/` directory
- [ ] Consider removing `/sh` or adding sandboxing

#### 1.3 Data Reliability
- [ ] Add JSON schema validation for history/settings files
- [ ] Implement file locking to prevent concurrent writes
- [ ] Add data corruption detection and recovery
- [ ] Create migration script for data format changes
- [ ] Add automated backup verification

### Phase 2: Code Refactoring (Priority: MEDIUM)
**Goal**: Improve maintainability and testability

#### 2.1 Modularization
Split `govnobot.ps1` into modules:
```
modules/
  ├── TelegramAPI.psm1      # API client, polling, message sending
  ├── CommandHandlers.psm1  # All /command implementations
  ├── AIIntegration.psm1    # Ollama, GitHub, OpenAI fallback logic
  ├── Persistence.psm1      # History, settings, cache management
  ├── Security.psm1         # Admin validation, rate limiting
  └── Utilities.psm1        # Logging, stats, chunking
```

#### 2.2 Configuration Management
Create `govnobot.config.json`:
```json
{
  "telegram": {
    "pollInterval": 30,
    "messageChunkSize": 4000
  },
  "ai": {
    "ollamaUrl": "http://localhost:11434/api/generate",
    "defaultModel": "llama2",
    "availableModels": ["llama2", "mistral", "neural-chat"]
  },
  "rateLimits": {
    "requestsPerMinute": 10,
    "requestsPerHour": 100
  },
  "features": {
    "conversationHistory": true,
    "responseCache": true,
    "adminCommands": true
  }
}
```

#### 2.3 Testing Framework
- [ ] Add Pester tests for core functions
- [ ] Mock Telegram API responses
- [ ] Test AI fallback chain
- [ ] Add integration tests for deployment script
- [ ] Create test fixtures for conversation history

### Phase 3: Feature Enhancements (Priority: LOW)
**Goal**: Expand capabilities and improve UX

#### 3.1 Enhanced AI Features
- [ ] Implement streaming responses (show "typing..." indicator)
- [ ] Add image generation support (`/imagine`)
- [ ] Implement code execution sandbox for `/agent`
- [ ] Add voice message transcription
- [ ] Support file uploads for context

#### 3.2 User Experience
- [ ] Add inline buttons for common actions (Yes/No, Retry, etc.)
- [ ] Implement conversation branching (save/load different contexts)
- [ ] Add `/export` command to download conversation history
- [ ] Create web dashboard for stats and settings
- [ ] Add multi-language support

#### 3.3 Performance Optimization
- [ ] Migrate to webhook mode (remove polling)
- [ ] Implement connection pooling for HTTP requests
- [ ] Add Redis for distributed caching
- [ ] Parallelize AI requests for `/chain` command
- [ ] Optimize JSON file reads (use streaming parser)

#### 3.4 Integration Expansion
- [ ] Add Slack bridge
- [ ] Implement Discord bot variant
- [ ] Add Google Calendar integration
- [ ] Create GitHub issue/PR management commands
- [ ] Add JIRA/Linear task tracking

### Phase 4: Production Deployment (Priority: HIGH)
**Goal**: Deploy to reliable hosting environment

#### 4.1 Containerization
- [ ] Create Dockerfile for bot
- [ ] Add docker-compose.yml with Ollama service
- [ ] Set up volume mounts for persistent data
- [ ] Configure health checks

#### 4.2 Cloud Deployment
Options:
- **AWS**: EC2 + EBS for data, CloudWatch for logs
- **Azure**: VM + Managed Disks, Application Insights
- **DigitalOcean**: Droplet + Block Storage
- **Railway/Render**: Simplest but limited control

Requirements:
- [ ] 2GB RAM minimum (for Ollama models)
- [ ] 20GB storage for models + data
- [ ] Static IP for webhook configuration
- [ ] Automated backup to S3/Azure Blob

#### 4.3 Monitoring & Observability
- [ ] Integrate with Prometheus/Grafana
- [ ] Add application metrics (response times, error rates)
- [ ] Set up alerting (PagerDuty/Opsgenie)
- [ ] Create operational runbook
- [ ] Add distributed tracing (OpenTelemetry)

---

## Immediate Action Items (Next 7 Days)

### 🔴 Critical (Do First)
1. **Fix deployment script exit code 1 failure**
   - Debug `govnodeploy.ps1 update -Version 2.2.5` error
   - Review terminal output in `govnobot_logs/govnodeploy.log`
   - Verify versioned script exists and is valid

2. **Implement audit logging for admin commands**
   ```powershell
   function Log-AdminAction {
       param($Username, $ChatId, $Command, $Timestamp)
       Add-Content "admin_audit.log" "[$Timestamp] @$Username ($ChatId): $Command"
   }
   ```

3. **Add graceful shutdown handling**
   ```powershell
   $null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
       Write-Log "Bot shutting down gracefully..."
       # Save in-memory state
   }
   ```

### 🟡 Important (This Week)
4. **Create ARCHITECTURE.md** (following C project pattern)
   - Document AI fallback flow diagram
   - Explain conversation history design
   - Describe security model

5. **Write deployment guide (DEPLOYMENT.md)**
   - Prerequisites (PowerShell 7+, Telegram Bot Token, Ollama)
   - Step-by-step setup instructions
   - Troubleshooting common issues

6. **Add health check endpoint**
   - Simple HTTP server on localhost:8080
   - Returns bot stats as JSON
   - Used by monitoring tools

7. **Implement file locking for persistence**
   ```powershell
   $lockFile = "$historyFile.lock"
   while (Test-Path $lockFile) { Start-Sleep -Milliseconds 100 }
   New-Item $lockFile | Out-Null
   # ... perform file operation
   Remove-Item $lockFile
   ```

### 🟢 Nice to Have (When Time Permits)
8. **Split into modules** (start with `TelegramAPI.psm1`)
9. **Add Pester tests** (focus on `RestrictToAdmin` and rate limiting)
10. **Create example configuration file** (`govnobot.config.example.json`)

---

## Questions & Decisions Needed

### Technical Decisions
1. **Should `/sh` command be removed or restricted further?**
   - Pro: Security risk mitigation
   - Con: Loses flexibility for automation
   - **Recommendation**: Add IP whitelist + command whitelist

2. **Is Ollama required or can bot run in NoLamma mode permanently?**
   - Current: Ollama is primary, NoLamma is fallback mode
   - **Recommendation**: Make NoLamma the default, Ollama optional (most users won't have local LLM)

3. **Should bot support multiple admins?**
   - Current: Single username + chat ID validation
   - **Recommendation**: Move to JSON file with admin list

### Feature Prioritization
4. **What is the `/dev` command supposed to do?**
   - Current implementation: "Mode activated" (no actual functionality)
   - Options: Code self-modification? Bot update trigger? Learning mode?
   - **Needs clarification from user**

5. **Is Facebook Messenger integration (`/jack`) a core feature?**
   - Current: Uses brittle SendKeys automation
   - **Recommendation**: Move to optional plugin or deprecate

6. **Should response caching be fully implemented?**
   - Current: Directory exists but not used
   - Impact: Reduces API costs, faster responses
   - **Recommendation**: Implement with 1-hour TTL

---

## Success Metrics

### Reliability
- [ ] 99% uptime over 30 days
- [ ] Zero data corruption incidents
- [ ] Mean time to recovery < 5 minutes

### Performance
- [ ] < 3s average response time for `/ask` (with Ollama)
- [ ] < 10s average response time (with fallback APIs)
- [ ] Handle 100+ messages/hour without degradation

### Security
- [ ] Zero unauthorized command executions
- [ ] All admin actions logged with audit trail
- [ ] No environment variable leaks in logs

### User Experience
- [ ] 90% of commands succeed on first try
- [ ] Average conversation length > 5 exchanges
- [ ] Positive feedback from admin user

---

## Resources & References

### External Documentation
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [GitHub Copilot CLI](https://github.com/github/copilot-cli)
- [PowerShell Best Practices](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)

### Internal Files
- `govnobot.ps1` - Main bot implementation
- `govnodeploy.ps1` - Deployment automation
- `sendMessageToJack.ps1` - Facebook Messenger integration
- `suggest_feedback.md` - User feedback improvements (referenced in v2.2.5)

### Environment Variables Required
```powershell
$env:TELEGRAM_GOVNOBOT_TOKEN          # Bot API token (required)
$env:TELEGRAM_GOVNOBOT_ADMIN_USERNAME # Admin Telegram username
$env:TELEGRAM_GOVNOBOT_ADMIN_CHATID   # Admin chat ID (integer)
# Optional:
$env:OPENAI_API_KEY                   # For OpenAI fallback
```

---

## Conclusion

GovnoBot is a **feature-rich but architecturally fragile** experimental Telegram bot. The rapid development pace (7 versions in one day) shows strong iteration velocity but has accumulated technical debt.

**Recommended Next Steps**:
1. Stabilize deployment infrastructure (fix exit code 1 error)
2. Harden security (audit logs, restrict `/sh`)
3. Document architecture and deployment process
4. Begin modularization (start with TelegramAPI)
5. Add monitoring and alerting

**Long-term Vision**: Transform from experimental script to production-ready service with containerization, proper testing, and cloud deployment.

---

*This plan will be updated as development progresses. Last reviewed: 2025-12-31*
