# GovnoBot Changelog

All notable changes to the GovnoBot project are documented in this file.

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
