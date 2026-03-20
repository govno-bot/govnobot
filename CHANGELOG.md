# GovnoBot Changelog

All notable changes to the GovnoBot project are documented in this file.

---

## [1.10.1] - 2026-03-18 - Patch

### ✅ Chore - Version bump & docs
- Bumped version to `1.10.1` in `package.json`.
- Added release note and updated project docs (`PRD.md`, `progress.txt`).
- Committed changes: `chore(release): bump version and update changelog`.

---

## [1.10.2] - 2026-03-20 - Patch

### ✅ Fix - Reminders, Persona, Tests
- Fixed nested file-locking deadlock in `ReminderStore` to avoid `Lock timeout for data\\reminders.json` errors and prevented the scheduler from crashing.
- Escaped angle-bracket usage in `/persona` help output to avoid Telegram HTML parse errors (unsupported start tag).
- Updated unit tests and mocks to match runtime behavior (`/ask` and metrics tests); all tests now pass.
- Committed as: `chore(release): bump version to 1.10.2`.

---



## [1.10.0] - 2026-03-05 - History Command Feature

### ✅ Added - Conversation History
- Integrated conversation logging into `/ask` command flow via `HistoryStore`.
- Implemented `/history` command to list last 10 interactions with Markdown formatting.
- Added `/history clear` subcommand to purge user conversation data.
- Added comprehensive unit tests for history interactions and persistence.

---

## [1.9.0] - 2026-03-05 - Signed Admin Audit Logging

### ✅ Added - Signed Audit System
- Introduced `AuditLogger` with cryptographic signing (HMAC-SHA256) for tamper-evident admin logs.
- Enforced `AUDIT_LOG_SECRET` for log integrity verification.
- Integrated audit logging into all admin commands automatically.
- Added comprehensive unit tests for `AuditLogger` covering signature validation and tamper detection.

---

## [1.8.0] - 2026-03-05 - Secure Admin CLI

### ✅ Added - Secure Admin Shell
- Developed `/sh <command>` command flow for secure remote shell execution.
- Added strict `isAdmin` enforcement for sensitive commands.
- Implemented command whitelist (`config.security.shCommandWhitelist`).
- Developed comprehensive TDD/BDD tests via `test/unit/command-sh.test.js` covering privilege escalation attempts, whitelist bypass, and output processing.
- Ensured shell output is truncated safely for Telegram API limits.
- Audited all admin actions via `logAuditAction` with timestamp and status.
- Updated version to 1.8.0.

---

## [1.7.0] - 2026-03-05 - Rate Limiting & Anti-Spam

### ✅ Added - Security & Rate Limiting
- Developed comprehensive rate-limit flow (per-user, per-minute, per-hour thresholds).
- Implemented user warning messages when rate limits are exceeded.
- Added strict enforcement in `CommandHandler` to block spam requests.
- Added `test/unit/rate-limit-flow.test.js` for TDD verification.
- Verified end-to-end integration via `test/acceptance/integration-e2e.test.js`.
- Updated version to 1.7.0.

---

## [1.6.0] - 2026-03-05 - Status & Version Reporting

### ✅ Added - Status & Version Commands
- Developed `/status` command to report bot uptime, memory usage, current model, and version.
- Developed `/version` command to report the current bot version.
- Integrated `/status` with live process metrics (uptime, heap usage).
- Updated configuration to version 1.6.0.
- Added comprehensive unit tests via `test/unit/command-status-version.test.js`.

---

## [1.5.0] - 2026-03-05 - Settings Management

### ✅ Added - Settings Command
- Developed `/settings` command flow for viewing current user configuration.
- Developed `/settings <key> <value>` flow for updating preferences.
- Added validation for `model` (must be in available list) and `systemPrompt` (any string).
- Standardized settings storage location to `data/settings/`.
- Ensured consistent settings access across `/model` and `/settings` commands.
- Added comprehensive unit tests via `test/unit/command-settings.test.js` and updated `test/unit/command-model.test.js`.

---

## [1.4.0] - 2026-03-05 - History Command

### ✅ Added - History Command
- Developed `/history` command flow for viewing recent conversation history.
- Developed `/history clear` flow for securely erasing user chat logs.
- Added message formatting with role icons (👤 and 🤖) and safe HTML escaping.
- Implemented robust error handling for history load/save failures.
- Added comprehensive unit tests via `test/unit/command-history.test.js`.
- Verified conversation continuity and empty state handling.

---

## [1.3.0] - 2026-03-05 - Model Selection & Persistence

### ✅ Added - Model Command
- Developed `/model` command flow for viewing available AI models and current selection.
- Developed `/model <name>` flow for switching models with real-time validation.
- Implemented persistent storage of user model preference via `SettingsStore`.
- Added strict model name validation against configured `availableModels`.
- Added specific error messaging for unknown or invalid models.
- Achieved 100% test coverage via `test/unit/command-model.test.js`.

---

## [1.2.0] - 2026-03-05 - AI Ask Command

### ✅ Added - Ask Command
- Developed `/ask <question>` command flow with AI integration.
- Implemented robust `FallbackChain` integration using `Ollama` (primary) and `OpenAI` (fallback).
- Added intelligent long-message splitting for Telegram message limits (4096 chars).
- Implemented graceful error handling and user feedback for AI outages.
- Added comprehensive unit tests (`test/unit/command-ask.test.js` and updated `command-handler.test.js`).
- Standardized `OllamaClient` and `OpenAIClient` interfaces for provider chain compatibility.

---

## [1.1.0] - 2026-03-05 - User Onboarding Flow

### ✅ Added - User Onboarding
- Developed `/start` command response with welcome message and usage instructions.
- Developed `/help` command output listing all available commands and model options.
- Implemented robust error handling and command routing for `/start` and `/help`.
- Added strict TDD/BDD tests for onboarding flow (`test/unit/onboarding.test.js`).
- Dynamic admin/user help message differentiation.

---

## [Node.js 1.0.0-alpha] - 2025-12-31 - Phase 1.1 Complete

### 🎉 Major: Node.js Rewrite Initiated

Complete rewrite from PowerShell to Node.js following TDD/BDD/ADD methodology.

### ✅ Added - Core Infrastructure

**Testing Framework (Zero Dependencies)**
- Custom test runner with ANSI colored output
- Assertion methods: `assert`, `assertEqual`, `assertDeepEqual`, `assertThrows`
- Automatic test discovery
- Summary reporting

**Core Modules**
- `src/utils/chunker.js` - Message splitting for Telegram 4096 char limit
  - 10 comprehensive test cases
  - Smart splitting at newlines
  - Unicode/emoji support
  - Code block preservation
  
- `src/config.js` - Configuration management
  - 10 comprehensive test cases
  - Pure Node.js .env parser (no dotenv dependency)
  - Type-safe getters (string, int, bool, array)
  - Validation with helpful error messages
  - Safe logging (no secret leakage)

**Project Scaffolding**
- Complete directory structure (src/, test/, data/)
- Helper scripts (init.js, bootstrap.js, demo.js)
- Comprehensive documentation (4 major docs)
- .gitignore, .env.example, package.json

### 📊 Test Coverage

- **20 tests** written and passing
- **100%** coverage of implemented modules
- **0** external dependencies
- TDD methodology strictly followed

### 📝 Documentation

- `GETTING-STARTED.md` - Complete setup guide
- `PROGRESS.md` - Phase 1.1 summary
- `IMPLEMENTATION-SUMMARY.md` - Detailed accomplishments
- `README.md` - Updated with Node.js info
- `govnoplan.node.md` - Complete 8-phase roadmap

### 🎯 Next Phase

Phase 1.2: Logger, File Lock, and Error Handler modules

---

## [PowerShell 2.2.6] - 2025-12-31

### Fixed
- PowerShell syntax issues with angle brackets in help text
- Ampersand encoding issues in emoji-based messages
- Parameter parsing for model selection

### Improved
- Deployment logging structure
## [PowerShell 2.3.1 / Node.js 2.3.1] - 2026-01-05

### 🛡️ Security
- Fixed critical admin enforcement bug in PowerShell: suppressed unintended output from `RestrictToAdmin` to ensure the function returns a clean boolean and does not leak message responses into the pipeline.
- Mirrored hardening in Node.js `govnobot.js` to maintain strict boolean admin checks.

### Changed
- Bumped minor version to `2.3.1` for both PowerShell and Node.js variants.

- Error message clarity

## [2.2.5] - 2025-12-31

### Added
- Backup management system
- Status checking for running bot instances
- Deployment tool enhancements

### Changed
- Log file organization and rotation
- Configuration storage structure

## [2.2.4] - Earlier Release

### Known Issues
- Syntax errors with angle brackets in documentation strings
- Ampersand character handling in emoji messages
- Parameter list formatting issues

## [2.2.3] - Earlier Release

## [2.2.2] - Earlier Release

## Earlier Versions

Initial development and testing versions of the bot.

---

## Development Notes

### Current Status
- Bot deployment functional with proper token configuration
- Ollama integration working for local model inference
- Telegram API connectivity established

### Known Issues to Address
- PowerShell script encoding with special characters
- Model switching command parsing
- Help text formatting with reserved operators

### Next Steps
1. Resolve PowerShell syntax issues in latest version
2. Add persistent configuration file support
3. Implement better error recovery
4. Add metrics and performance monitoring
5. Create web-based dashboard for management

## Deployment Tool

The `govnodeploy.ps1` script provides the following operations:
- `status` - Check if bot instance is running
- `start` - Launch bot instance with configuration
- `stop` - Gracefully terminate bot
- `backup` - Create timestamped backup of data
- `logs` - View deployment logs
- `update` - Update to specific version

---

Generated: 2025-12-31
