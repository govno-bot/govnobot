# GovnoBot Changelog

All notable changes to the GovnoBot project are documented in this file.

## [2.2.6] - 2025-12-31

### Fixed
- PowerShell syntax issues with angle brackets in help text
- Ampersand encoding issues in emoji-based messages
- Parameter parsing for model selection

### Improved
- Deployment logging structure
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
