# GovnoBot Node.js - TODO & Roadmap

**Current Phase:** 1.1 ✅ Complete  
**Next Phase:** 1.2 🔄 In Progress  
**Last Updated:** 2025-12-31

---

## 🎯 Immediate Next Steps (Phase 1.2)

### 1. Logger Module

**Priority:** High  
**Status:** Not Started  
**Estimated:** 2-3 hours

#### Tasks
- [ ] Write test file: `test/unit/logger.test.js` (10+ tests)
  - [ ] Test log levels (debug, info, warn, error)
  - [ ] Test file output
  - [ ] Test console output
  - [ ] Test timestamp formatting
  - [ ] Test structured logging (JSON)
  - [ ] Test log rotation (optional)
  - [ ] Test log level filtering
  - [ ] Test error stack traces
  - [ ] Test metadata inclusion
  - [ ] Test concurrent logging
  
- [ ] Implement `src/utils/logger.js`
  - [ ] Multiple log levels
  - [ ] File and console output
  - [ ] Timestamp formatting
  - [ ] Structured logging support
  - [ ] Configurable output format

#### Acceptance Criteria
- ✅ 10+ tests passing
- ✅ Logs to file and console
- ✅ Different log levels work
- ✅ Timestamps are formatted correctly
- ✅ Zero external dependencies

---

### 2. File Lock Module

**Priority:** High  
**Status:** Not Started  
**Estimated:** 2-3 hours

#### Tasks
- [ ] Write test file: `test/unit/file-lock.test.js` (8+ tests)
  - [ ] Test lock acquisition
  - [ ] Test lock release
  - [ ] Test concurrent access prevention
  - [ ] Test timeout handling
  - [ ] Test stale lock cleanup
  - [ ] Test process ID tracking
  - [ ] Test lock directory creation
  - [ ] Test error handling
  
- [ ] Implement `src/storage/file-lock.js`
  - [ ] Acquire lock with PID
  - [ ] Release lock
  - [ ] Timeout mechanism
  - [ ] Stale lock detection
  - [ ] Atomic operations

#### Acceptance Criteria
- ✅ 8+ tests passing
- ✅ Prevents concurrent writes
- ✅ Handles stale locks
- ✅ Timeout works correctly
- ✅ Zero external dependencies

---

### 3. Error Handler Module

**Priority:** Medium  
**Status:** Not Started  
**Estimated:** 2 hours

#### Tasks
- [ ] Write test file: `test/unit/error-handler.test.js` (8+ tests)
  - [ ] Test error wrapping
  - [ ] Test user-friendly messages
  - [ ] Test stack trace handling
  - [ ] Test error logging
  - [ ] Test recovery strategies
  - [ ] Test error categorization
  - [ ] Test context preservation
  - [ ] Test async error handling
  
- [ ] Implement `src/utils/error-handler.js`
  - [ ] Graceful error recovery
  - [ ] User-friendly messages
  - [ ] Error logging with context
  - [ ] Stack trace formatting
  - [ ] Recovery strategies

#### Acceptance Criteria
- ✅ 8+ tests passing
- ✅ Errors are user-friendly
- ✅ Context is preserved
- ✅ Logging integration works
- ✅ Zero external dependencies

---

## 📋 Phase 2: Storage & Persistence

**Priority:** High  
**Status:** Not Started  
**Estimated:** 1 week

### 2.1 History Store

- [ ] Write tests: `test/unit/history-store.test.js`
- [ ] Implement: `src/storage/history-store.js`
  - [ ] Save user messages
  - [ ] Load conversation history
  - [ ] Get context for AI
  - [ ] Clear history
  - [ ] Concurrent access with file lock

### 2.2 Settings Store

- [ ] Write tests: `test/unit/settings-store.test.js`
- [ ] Implement: `src/storage/settings-store.js`
  - [ ] Save user settings
  - [ ] Load user settings
  - [ ] Update settings
  - [ ] Default values
  - [ ] Validation

### 2.3 Backup Manager

- [ ] Write tests: `test/unit/backup-manager.test.js`
- [ ] Implement: `src/storage/backup-manager.js`
  - [ ] Create timestamped backups
  - [ ] Compress with zlib
  - [ ] List available backups
  - [ ] Restore from backup
  - [ ] Retention policy (keep last N)

---

## 🔒 Phase 3: Security

**Priority:** High  
**Status:** Not Started  
**Estimated:** 1 week

### 3.1 Rate Limiter

- [ ] Write feature: `test/features/rate-limiting.feature`
- [ ] Write acceptance: `test/acceptance/rate-limit-enforcement.test.js`
- [ ] Write unit tests: `test/unit/rate-limiter.test.js`
- [ ] Implement: `src/security/rate-limiter.js`
  - [ ] Per-user rate limiting
  - [ ] Per-minute limits
  - [ ] Per-hour limits
  - [ ] Reset tracking
  - [ ] Quota checking

### 3.2 Admin Validator

- [ ] Write tests: `test/unit/admin-validator.test.js`
- [ ] Implement: `src/security/admin-validator.js`
  - [ ] Username validation
  - [ ] Chat ID validation
  - [ ] IP whitelist checking
  - [ ] IP blacklist checking
  - [ ] Clear error messages

### 3.3 Crypto Utils

- [ ] Write tests: `test/unit/crypto-utils.test.js`
- [ ] Implement: `src/security/crypto-utils.js`
  - [ ] Sign audit log entries
  - [ ] Verify signatures
  - [ ] HMAC-SHA256 implementation
  - [ ] Handle missing keys

---

## 📡 Phase 4: Telegram API

**Priority:** High  
**Status:** Not Started  
**Estimated:** 1-2 weeks

### 4.1 Telegram API Client

- [ ] Write mocks: `test/mocks/telegram-api.mock.js`
- [ ] Write tests: `test/unit/telegram-api-client.test.js`
- [ ] Write acceptance: `test/acceptance/telegram-polling.test.js`
- [ ] Implement: `src/telegram/api-client.js`
  - [ ] HTTP client (no axios!)
  - [ ] getUpdates endpoint
  - [ ] sendMessage endpoint
  - [ ] editMessage endpoint
  - [ ] Message chunking integration
  - [ ] Error handling with exponential backoff

### 4.2 Polling Loop

- [ ] Write tests: `test/unit/polling.test.js`
- [ ] Write acceptance: `test/acceptance/polling-resilience.test.js`
- [ ] Implement: `src/telegram/polling.js`
  - [ ] Long polling (30 second timeout)
  - [ ] Update offset tracking
  - [ ] Error recovery
  - [ ] Exponential backoff
  - [ ] Graceful shutdown (SIGINT)

---

## 🤖 Phase 5: AI Integration

**Priority:** High  
**Status:** Not Started  
**Estimated:** 1 week

### 5.1 Ollama Client

- [ ] Write mocks: `test/mocks/ollama-api.mock.js`
- [ ] Write tests: `test/unit/ollama.test.js`
- [ ] Implement: `src/ai/ollama.js`
  - [ ] HTTP client to Ollama
  - [ ] Generate endpoint
  - [ ] Model selection
  - [ ] Context handling
  - [ ] Streaming support

### 5.2 OpenAI Client

- [ ] Write mocks: `test/mocks/openai-api.mock.js`
- [ ] Write tests: `test/unit/openai.test.js`
- [ ] Implement: `src/ai/openai.js`
  - [ ] OpenAI API client
  - [ ] Completion endpoint
  - [ ] API key handling
  - [ ] Error handling

### 5.3 Fallback Chain

- [ ] Write feature: `test/features/ai-fallback-chain.feature`
- [ ] Write tests: `test/unit/fallback-chain.test.js`
- [ ] Write acceptance: `test/acceptance/ai-fallback-chain.test.js`
- [ ] Implement: `src/ai/fallback-chain.js`
  - [ ] Try Ollama first
  - [ ] Try GitHub Copilot CLI
  - [ ] Try OpenAI API
  - [ ] Return helpful error if all fail

---

## 💬 Phase 6: Bot Commands

**Priority:** High  
**Status:** Not Started  
**Estimated:** 2 weeks

### 6.1 Command Handler

- [ ] Write tests: `test/unit/command-handler.test.js`
- [ ] Implement: `src/commands/command-handler.js`
  - [ ] Route commands
  - [ ] Parse arguments
  - [ ] Error handling
  - [ ] Permission checking

### 6.2 Public Commands

- [ ] `/start` command
  - [ ] Tests: `test/unit/commands/start.test.js`
  - [ ] Implementation: `src/commands/public/start.js`

- [ ] `/help` command
  - [ ] Tests: `test/unit/commands/help.test.js`
  - [ ] Implementation: `src/commands/public/help.js`

- [ ] `/ask` command (PRIORITY)
  - [ ] Feature: `test/features/user-asks-question.feature`
  - [ ] Acceptance: `test/acceptance/ask-command.test.js`
  - [ ] Tests: `test/unit/commands/ask.test.js`
  - [ ] Implementation: `src/commands/public/ask.js`

- [ ] `/fix` command
  - [ ] Feature: `test/features/user-fixes-code.feature`
  - [ ] Acceptance: `test/acceptance/fix-command.test.js`
  - [ ] Tests: `test/unit/commands/fix.test.js`
  - [ ] Implementation: `src/commands/public/fix.js`

- [ ] `/history` command
- [ ] `/model` command
- [ ] `/settings` command
- [ ] `/stats` command
- [ ] `/status` command
- [ ] `/version` command

### 6.3 Admin Commands

- [ ] `/sh` command
  - [ ] Feature: `test/features/admin-executes-shell.feature`
  - [ ] Acceptance: `test/acceptance/sh-command.test.js`
  - [ ] Tests: `test/unit/commands/sh.test.js`
  - [ ] Implementation: `src/commands/admin/sh.js`
  - [ ] Whitelist enforcement
  - [ ] Audit logging

- [ ] `/agent` command
  - [ ] Feature: `test/features/admin-multi-step-task.feature`
  - [ ] Tests: `test/unit/commands/agent.test.js`
  - [ ] Implementation: `src/commands/admin/agent.js`

---

## 🧪 Phase 7: Integration & E2E

**Priority:** Medium  
**Status:** Not Started  
**Estimated:** 1 week

### Tasks

- [ ] Write acceptance tests for complete workflows
  - [ ] User conversation flow
  - [ ] Admin command flow
  - [ ] Error recovery flow
  - [ ] Rate limiting enforcement

- [ ] Write integration tests
  - [ ] End-to-end message handling
  - [ ] Storage persistence
  - [ ] AI integration
  - [ ] Command processing

- [ ] Performance testing
  - [ ] Response time measurements
  - [ ] Memory usage profiling
  - [ ] Concurrent user simulation

---

## 📚 Phase 8: Documentation

**Priority:** Medium  
**Status:** Not Started  
**Estimated:** 1 week

### Tasks

- [ ] Generate `ARCHITECTURE.md` from code
- [ ] Generate `API.md` from JSDoc comments
- [ ] Create `TEST-STRATEGY.md`
- [ ] Create `FEATURE-SPECIFICATIONS.md` from .feature files
- [ ] Create `DEPLOYMENT.md` production guide
- [ ] Update `CONTRIBUTING.md` with TDD workflow
- [ ] Create video tutorial (optional)
- [ ] Create architecture diagrams (optional)

---

## 🎨 Nice to Have (Future)

**Priority:** Low  
**Status:** Not Planned Yet

- [ ] Inline buttons for common actions
- [ ] Voice message support
- [ ] Image generation (`/imagine` command)
- [ ] Web dashboard
- [ ] Prometheus metrics export
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Automated deployment
- [ ] Multi-language support
- [ ] Plugin system

---

## 📊 Progress Tracking

### Overall Progress

- [x] Phase 1.1 - Test Infrastructure ✅ **COMPLETE**
- [ ] Phase 1.2 - Core Utilities (🔄 0/3 modules)
- [ ] Phase 2 - Storage (⏳ 0/3 modules)
- [ ] Phase 3 - Security (⏳ 0/3 modules)
- [ ] Phase 4 - Telegram API (⏳ 0/2 modules)
- [ ] Phase 5 - AI Integration (⏳ 0/3 modules)
- [ ] Phase 6 - Bot Commands (⏳ 0/12 commands)
- [ ] Phase 7 - Integration Tests (⏳ Not started)
- [ ] Phase 8 - Documentation (⏳ Not started)

### Test Count Target

| Phase | Target Tests | Current | Status |
|-------|-------------|---------|--------|
| 1.1 | 20 | 20 | ✅ Complete |
| 1.2 | 26+ | 0 | 🔄 Next |
| 2 | 30+ | 0 | ⏳ Planned |
| 3 | 25+ | 0 | ⏳ Planned |
| 4 | 20+ | 0 | ⏳ Planned |
| 5 | 20+ | 0 | ⏳ Planned |
| 6 | 50+ | 0 | ⏳ Planned |
| 7 | 20+ | 0 | ⏳ Planned |
| **Total** | **211+** | **20** | **9.5%** |

---

## 🎯 Milestones

### Milestone 1: Foundation (Phase 1) ✅
- ✅ Test infrastructure
- 🔄 Core utilities (in progress)

**Completion:** 66% (2/3 modules)

### Milestone 2: Data Layer (Phase 2)
- ⏳ Storage modules
- ⏳ Persistence

**Target Date:** Week 2

### Milestone 3: API Integration (Phases 3-4)
- ⏳ Security
- ⏳ Telegram API

**Target Date:** Week 4

### Milestone 4: AI & Commands (Phases 5-6)
- ⏳ AI integration
- ⏳ Bot commands

**Target Date:** Week 7

### Milestone 5: Production Ready (Phases 7-8)
- ⏳ Integration tests
- ⏳ Documentation

**Target Date:** Week 9

---

## 📝 Notes

### Development Principles

1. **TDD Always** - Write tests first, no exceptions
2. **Zero Dependencies** - Use only Node.js standard library
3. **Small Commits** - Commit after each passing test
4. **Document As You Go** - Update docs with each module
5. **Run Tests Frequently** - After every change

### Code Review Checklist

Before committing:
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] JSDoc comments on all functions
- [ ] No console.log (use logger)
- [ ] Error handling implemented
- [ ] Edge cases covered

### Performance Targets

- Startup time: < 500ms
- Memory usage: < 100MB
- Response time: < 2s (avg)
- Test execution: < 10s (full suite)

---

**Last Updated:** 2025-12-31  
**Next Review:** After Phase 1.2 completion  
**Methodology:** TDD/BDD/ADD

---

*Keep this file updated as we progress!*
