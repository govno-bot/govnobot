# GovnoBot Node.js Development Plan (TDD/BDD/ADD)
**Last Updated**: 2025-12-31  
**Current Version**: 1.0.0 (Node.js Port)  
**Status**: TDD/BDD Specifications & Planning Phase  
**Methodology**: Test-Driven Development (TDD), Behavior-Driven Development (BDD), Acceptance-Driven Development (ADD)

---

## Executive Summary

GovnoBot for **Node.js** is a pure JavaScript rewrite of the PowerShell bot without any external dependencies (npm packages). Built on Node.js native APIs using only the standard library:
- `http` - Telegram Bot API client
- `fs` - File-based persistence (history, settings, backups)
- `path` - Cross-platform path handling
- `crypto` - Audit log signing
- `zlib` - Backup compression

### Design Philosophy
- **Zero Dependencies**: No npm install required
- **Single Process**: No background job spawning
- **Portable**: Works on Windows, macOS, Linux
- **Embeddable**: Can be integrated into larger systems
- **Educational**: Clear code for learning Node.js patterns
- **Test-First**: All features driven by acceptance tests (ADD)
- **Behavior-Focused**: Tests written in human-readable scenarios (BDD)
- **Specification-First**: Code is specification implementation (TDD)

### Development Approach

**TDD (Test-Driven Development)**:
- Red → Green → Refactor cycle
- Unit tests drive implementation
- Tests are executable specifications
- Examples: `test/unit/rate-limiter.test.js`, `test/unit/chunker.test.js`

**BDD (Behavior-Driven Development)**:
- Feature scenarios in Given-When-Then format
- Acceptance criteria derived from user stories
- Examples: `test/features/user-asks-question.feature`
- Readable by non-technical stakeholders

**ADD (Acceptance-Driven Development)**:
- User acceptance tests before implementation
- Feature complete only when all acceptance tests pass
- Integration tests validate entire workflows
- Examples: `test/acceptance/ask-command.test.js`

### Key Advantages Over PowerShell Version
- ✅ Faster startup time (no PowerShell interpreter overhead)
- ✅ Better cross-platform support (Windows/Linux/macOS)
- ✅ Native async/await for concurrent requests
- ✅ Simpler deployment (single executable with pkg)
- ✅ Smaller memory footprint
- ✅ No PowerShell syntax issues with special characters
- ✅ Native JSON handling with streaming parser
- ✅ Built-in TLS/SSL support
- ✅ **100% test coverage from day one (TDD)**
- ✅ **Executable specifications (BDD)**
- ✅ **User-focused acceptance criteria (ADD)**

---

## Test-Driven Architecture

### Project Structure (Test-First)

```
govnobot-node/
├── src/                           # Implementation (driven by tests)
│   ├── index.js                   # Entry point
│   ├── config.js                  # Configuration management
│   ├── telegram/
│   │   ├── api-client.js         # Telegram Bot API HTTP client
│   │   └── polling.js            # Long polling implementation
│   ├── ai/
│   │   ├── fallback-chain.js     # Ollama → GitHub → OpenAI → Error
│   │   ├── ollama.js             # Local Ollama HTTP client
│   │   └── openai.js             # OpenAI API client (with fallback)
│   ├── commands/
│   │   ├── command-handler.js    # Command router
│   │   ├── public/
│   │   │   ├── start.js          # /start command
│   │   │   ├── help.js           # /help command
│   │   │   ├── ask.js            # /ask with context
│   │   │   ├── fix.js            # /fix with history
│   │   │   ├── model.js          # /model command
│   │   │   ├── history.js        # /history command
│   │   │   ├── settings.js       # /settings command
│   │   │   ├── status.js         # /status command
│   │   │   ├── stats.js          # /stats command
│   │   │   └── version.js        # /version command
│   │   └── admin/
│   │       ├── sh.js             # /sh (shell execution)
│   │       ├── agent.js          # /agent (multi-step tasks)
│   │       └── audit.js          # Admin action logging
│   ├── storage/
│   │   ├── history-store.js      # User conversation persistence
│   │   ├── settings-store.js     # User preferences persistence
│   │   ├── backup-manager.js     # Backup creation and restoration
│   │   └── file-lock.js          # Concurrent access control
│   ├── security/
│   │   ├── rate-limiter.js       # Per-user rate limiting
│   │   ├── admin-validator.js    # Admin username/chatId validation
│   │   └── crypto-utils.js       # Audit log signing
│   └── utils/
│       ├── logger.js             # Structured logging
│       ├── chunker.js            # Message chunking (4096 chars)
│       ├── error-handler.js      # Graceful error recovery
│       └── health-check.js       # Status/stats endpoint
│
├── test/                         # Tests (drive all development)
│   ├── unit/                     # Unit tests (TDD - test first)
│   │   ├── rate-limiter.test.js
│   │   ├── chunker.test.js
│   │   ├── file-lock.test.js
│   │   ├── history-store.test.js
│   │   ├── settings-store.test.js
│   │   ├── admin-validator.test.js
│   │   ├── crypto-utils.test.js
│   │   ├── logger.test.js
│   │   └── backup-manager.test.js
│   │
│   ├── features/                 # BDD feature specifications
│   │   ├── user-asks-question.feature
│   │   ├── user-switches-model.feature
│   │   ├── admin-executes-shell.feature
│   │   ├── admin-audit-logging.feature
│   │   ├── rate-limiting.feature
│   │   ├── user-conversation-history.feature
│   │   └── backup-and-restore.feature
│   │
│   ├── acceptance/               # ADD - acceptance tests
│   │   ├── ask-command.test.js
│   │   ├── fix-command.test.js
│   │   ├── model-command.test.js
│   │   ├── admin-sh-command.test.js
│   │   ├── conversation-flow.test.js
│   │   ├── rate-limit-enforcement.test.js
│   │   ├── backup-recovery.test.js
│   │   ├── polling-resilience.test.js
│   │   └── ai-fallback-chain.test.js
│   │
│   ├── mocks/                    # Test doubles and fixtures
│   │   ├── telegram-api.mock.js
│   │   ├── ollama-api.mock.js
│   │   ├── openai-api.mock.js
│   │   ├── fs-mock.js
│   │   └── test-fixtures.js
│   │
│   └── run-all.js               # Test runner (no external deps)
│
├── data/
│   ├── history/                  # Per-user conversation logs (.json)
│   ├── settings/                 # Per-user preferences (.json)
│   ├── backups/                  # Timestamped backup archives (.tar.gz)
│   └── audit.log                 # Signed admin action logs
│
├── docs/
│   ├── ARCHITECTURE.md           # System design (driven by tests)
│   ├── TEST-STRATEGY.md          # Testing approach (TDD/BDD/ADD)
│   ├── CONTRIBUTING.md           # Development guide (test-first workflow)
│   └── FEATURE-SPECIFICATIONS.md # BDD feature scenarios
│
├── package.json                  # Metadata only (no dependencies)
├── .env.example                  # Environment variable template
├── README.md                     # Usage guide
├── DEPLOYMENT.md                # Production deployment guide
├── .test-setup.js               # Test initialization (if needed)
└── govnobot.js                  # Built/minified single file (optional)
```

### Testing Framework (Built-in, No Dependencies)

We use native Node.js with a minimal custom test runner supporting:
- **Assertion**: Native `console.assert()` for test assertions
- **Mocking**: Custom mock functions and fixtures
- **Test Organization**: Directory structure + naming convention
- **Test Execution**: Simple `node test/run-all.js`
- **Reporting**: Colored console output with pass/fail counts

### Core Components

#### 1. Telegram API Client (`src/telegram/api-client.js`)
```javascript
class TelegramAPIClient {
  constructor(botToken) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }
  
  async getUpdates(offset, timeout = 30) {
    // HTTP GET with exponential backoff
    // Returns @{ok, result: Message[]}
  }
  
  async sendMessage(chatId, text, options = {}) {
    // POST request with message chunking
    // Handles 4096 char limit
  }
  
  async editMessage(chatId, messageId, text) {
    // Update existing message
  }
}
```

#### 2. Polling Loop (`src/telegram/polling.js`)
```javascript
async function startPolling(client, updateHandler) {
  let offset = 0;
  const POLL_INTERVAL = 30000; // 30 seconds (configurable)
  const MAX_BACKOFF = 300000;   // Max 5 minutes
  
  while (true) {
    try {
      const response = await client.getUpdates(offset, timeout: 30);
      for (const update of response.result) {
        await updateHandler(update);
        offset = update.update_id + 1;
      }
      backoffMultiplier = 1; // Reset on success
    } catch (error) {
      backoffMultiplier = Math.min(backoffMultiplier * 2, MAX_BACKOFF);
      await sleep(backoffMultiplier);
    }
  }
}
```

#### 3. AI Fallback Chain (`src/ai/fallback-chain.js`)
```javascript
async function queryAI(query, userContext) {
  // Try Ollama first
  try {
    return await ollama.generate(query, userContext.model);
  } catch (e) {
    logger.info('Ollama failed, trying GitHub Copilot CLI');
  }
  
  // Try GitHub Copilot CLI
  try {
    return await runCommand('gh copilot suggest "' + query + '"');
  } catch (e) {
    logger.info('Copilot failed, trying OpenAI');
  }
  
  // Try OpenAI API
  if (process.env.OPENAI_API_KEY) {
    try {
      return await openai.complete(query, userContext.systemPrompt);
    } catch (e) {
      logger.warn('OpenAI failed');
    }
  }
  
  // All failed
  throw new AIError('All AI services unavailable');
}
```

#### 4. History Storage (`src/storage/history-store.js`)
```javascript
class HistoryStore {
  constructor(dataDir = './data/history') {
    this.dataDir = dataDir;
  }
  
  async loadHistory(chatId, maxMessages = 100) {
    // Load with file lock
    // Return last maxMessages entries
  }
  
  async addMessage(chatId, role, content, timestamp) {
    // Append to history with lock
    // @{timestamp, role, content}
  }
  
  async getContext(chatId, contextSize = 5) {
    // Return last contextSize messages for AI context
  }
  
  async clearHistory(chatId) {
    // Delete conversation history
  }
}
```

#### 5. Rate Limiter (`src/security/rate-limiter.js`)
```javascript
class RateLimiter {
  constructor(requestsPerMinute = 10, requestsPerHour = 100) {
    this.limits = new Map(); // chatId -> {minute: [], hour: []}
  }
  
  isAllowed(chatId) {
    // Check if within limits
    // Track requests with timestamp
    // Return boolean
  }
  
  getStatus(chatId) {
    // Return remaining quota
  }
}
```

#### 6. File Locking (`src/storage/file-lock.js`)
```javascript
async function withFileLock(filePath, callback) {
  const lockPath = filePath + '.lock';
  const lockTimeoutMs = 5000;
  
  // Wait for lock or timeout
  while (fs.existsSync(lockPath)) {
    if (Date.now() - lockMtime > lockTimeoutMs) {
      fs.unlinkSync(lockPath); // Force unlock (stale)
    }
    await sleep(100);
  }
  
  // Acquire lock
  fs.writeFileSync(lockPath, process.pid.toString());
  
  try {
    return await callback();
  } finally {
    fs.unlinkSync(lockPath); // Release lock
  }
}
```

---

## Mock Objects & Test Fixtures

### Telegram API Mock (`test/mocks/telegram-api.mock.js`)

```javascript
// test/mocks/telegram-api.mock.js
class MockTelegramAPI {
  constructor() {
    this.sentMessages = [];
    this.updates = [];
    this.nextUpdateId = 0;
  }
  
  mockUpdate(data) {
    // Simulate incoming update
    this.updates.push({
      update_id: this.nextUpdateId++,
      message: {
        chat: { id: data.chatId },
        from: { username: data.username },
        text: data.text,
        date: Math.floor(Date.now() / 1000),
        ...data
      }
    });
  }
  
  async getUpdates(offset) {
    return {
      ok: true,
      result: this.updates.filter(u => u.update_id >= offset)
    };
  }
  
  async sendMessage(chatId, text) {
    const messageId = Date.now();
    this.sentMessages.push({ chatId, text, messageId });
    return { ok: true, result: { message_id: messageId } };
  }
  
  getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }
  
  getSentMessages() {
    return this.sentMessages;
  }
}

function mockTelegramUpdate(data) {
  return {
    update_id: data.updateId || 1,
    message: {
      message_id: data.messageId || 1,
      chat: { id: data.chatId || 123456 },
      from: {
        id: data.userId || 123,
        is_bot: false,
        username: data.username || 'testuser',
      },
      date: Math.floor(Date.now() / 1000),
      text: data.text || '',
      ...data
    }
  };
}

module.exports = { MockTelegramAPI, mockTelegramUpdate };
```

### Ollama API Mock (`test/mocks/ollama-api.mock.js`)

```javascript
class MockOllamaAPI {
  constructor() {
    this.responses = {};
    this.defaultResponse = 'Mock Ollama response';
    this.failNext = false;
  }
  
  setResponse(query, response) {
    this.responses[query] = response;
  }
  
  setDefaultResponse(response) {
    this.defaultResponse = response;
  }
  
  failNextCall() {
    this.failNext = true;
  }
  
  async generate(prompt, model = 'llama2') {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('Ollama service unavailable');
    }
    
    return this.responses[prompt] || this.defaultResponse;
  }
}

module.exports = { MockOllamaAPI };
```

### File System Mock (`test/mocks/fs-mock.js`)

```javascript
class MockFileSystem {
  constructor() {
    this.files = new Map();
    this.locks = new Set();
  }
  
  writeFileSync(path, content) {
    if (this.locks.has(path)) {
      throw new Error(`File locked: ${path}`);
    }
    this.files.set(path, content);
  }
  
  readFileSync(path) {
    if (!this.files.has(path)) {
      throw new Error(`ENOENT: ${path}`);
    }
    return this.files.get(path);
  }
  
  existsSync(path) {
    return this.files.has(path);
  }
  
  unlinkSync(path) {
    this.files.delete(path);
  }
  
  acquireLock(path) {
    if (this.locks.has(path)) return false;
    this.locks.add(path);
    return true;
  }
  
  releaseLock(path) {
    this.locks.delete(path);
  }
}

module.exports = { MockFileSystem };
```

### Test Fixtures (`test/mocks/test-fixtures.js`)

```javascript
const testFixtures = {
  validUpdate: {
    chatId: 123456,
    username: 'testuser',
    text: '/ask What is AI?'
  },
  
  longMessage: {
    text: 'A'.repeat(8000),
    expected: 2 // Should split into 2 chunks
  },
  
  conversationHistory: [
    { role: 'user', content: 'What is Python?' },
    { role: 'assistant', content: 'Python is a programming language...' },
    { role: 'user', content: 'How is it different from JavaScript?' },
    { role: 'assistant', content: 'Python vs JavaScript...' }
  ],
  
  validSettings: {
    systemPrompt: 'You are a helpful assistant.',
    model: 'llama2',
    maxHistoryContext: 5
  },
  
  adminUser: {
    username: 'alice',
    chatId: 999999,
    isAdmin: true
  },
  
  regularUser: {
    username: 'bob',
    chatId: 123456,
    isAdmin: false
  }
};

module.exports = testFixtures;
```

---

## BDD Feature Specifications

### Rate Limiting Feature (`test/features/rate-limiting.feature`)

```gherkin
Feature: Rate limiting protects API
  As a bot administrator
  I want to limit how many requests users can make
  So that the AI services don't get overwhelmed

  Background:
    Given rate limit is 10 requests per minute
    And rate limit is 100 requests per hour
    And the current time is 2025-12-31 14:00:00

  Scenario: User within limits can send requests
    When user sends 5 requests in 1 minute
    Then all 5 requests are processed
    And user can send 5 more before hitting limit

  Scenario: User exceeding per-minute limit is throttled
    When user sends 11 requests in 1 minute
    Then the first 10 succeed
    And the 11th is rejected with error
    And error message includes reset time
    And user must wait 1 minute before trying again

  Scenario: User exceeding per-hour limit is throttled
    When user sends 100 requests in 55 minutes
    And tries to send the 101st request at 55:30
    Then the 101st request is rejected
    And error says "hourly limit exceeded"
    And reset happens at hour boundary

  Scenario: Rate limit resets after time window
    Given user has hit their minute limit
    When 61 seconds pass
    Then user can send requests again
```

### User Asks Question Feature (`test/features/user-asks-question.feature`)

```gherkin
Feature: User asks question with /ask command
  As a user
  I want to ask questions and get AI responses
  So that I can get information from the bot

  Background:
    Given the bot is running
    And Ollama service is available
    And user has chat ID 123456
    And user has username "testuser"

  Scenario: User asks simple question
    When user sends "/ask What is Node.js?"
    Then bot shows typing indicator
    And bot queries AI with question
    And bot receives response
    And bot sends response to user
    And response is <= 4096 characters
    And question is saved to history as "user" role
    And response is saved to history as "assistant" role

  Scenario: Question with context includes history
    Given user's conversation has:
      | What is Python?       |
      | Python is a language  |
    When user sends "/ask How is it different from Node.js?"
    Then AI query includes Python context
    And AI query includes new question
    And response compares both languages

  Scenario: Long response is split into chunks
    Given AI will return 8000 character response
    When user sends "/ask Long question"
    Then response is split into 2 messages
    And first message is 4096 characters
    And second message is <= 4000 characters
    And both messages are delivered
```

### Admin Audit Logging Feature (`test/features/admin-audit-logging.feature`)

```gherkin
Feature: Admin action audit trail
  As a security administrator
  I want all admin actions logged
  So that I can track what was done and verify integrity

  Scenario: Admin /sh command is logged
    Given admin @alice with ID 999999 is authenticated
    And /sh command is whitelisted: "ls"
    When admin sends "/sh ls /home"
    Then action is logged with:
      | Timestamp | 2025-12-31T14:00:12Z        |
      | Action    | /sh                         |
      | Admin     | @alice (999999)             |
      | Command   | ls /home                    |
      | Status    | SUCCESS                     |
    And log entry is signed with HMAC-SHA256
    And signature can be verified with bot secret

  Scenario: Denied admin action is logged
    Given admin @alice is authenticated
    And IP 192.168.1.100 is NOT whitelisted
    When admin from IP 192.168.1.100 sends "/sh ls"
    Then action is logged with:
      | Status | DENIED             |
      | Reason | IP not whitelisted |
    And signature is valid
```

---

## Command Architecture (TDD Pattern)

### Every Command Follows This Pattern

1. **Write Acceptance Test** - `test/acceptance/{command}.test.js`
   - User sends command
   - Expected behavior verified
   - Side effects checked (history saved, etc.)

2. **Write BDD Feature** - `test/features/{feature}.feature`
   - Human-readable scenarios
   - Given-When-Then format

3. **Write Unit Tests** - `test/unit/commands/{command}.test.js`
   - Test helper functions
   - Test error handling

4. **Implement Command** - `src/commands/{public|admin}/{command}.js`
   - Minimal code to pass tests
   - All edge cases covered by tests

### Data Persistence Design

### History File Format (`data/history/{chatId}.json`)
```json
[
  {
    "timestamp": "2025-12-31T14:00:00Z",
    "role": "user",
    "content": "Hello, what is Node.js?"
  },
  {
    "timestamp": "2025-12-31T14:00:05Z",
    "role": "assistant",
    "content": "Node.js is a JavaScript runtime..."
  }
]
```

### Settings File Format (`data/settings/{chatId}.json`)
```json
{
  "systemPrompt": "You are a helpful assistant.",
  "model": "llama2",
  "maxHistoryContext": 5,
  "createdAt": "2025-12-31T10:00:00Z",
  "updatedAt": "2025-12-31T14:00:00Z"
}
```

### Backup Format (`data/backups/backup_2025-12-31_140000.tar.gz`)
```
backup_2025-12-31_140000/
├── history/
│   ├── 123456789.json
│   └── 987654321.json
├── settings/
│   ├── 123456789.json
│   └── 987654321.json
└── metadata.json
  {
    "timestamp": "2025-12-31T14:00:00Z",
    "bot_version": "1.0.0",
    "total_users": 2,
    "total_messages": 156
  }
```

### Audit Log Format (`data/audit.log`)
```
[2025-12-31T14:00:12Z] ACTION: /sh ADMIN: @alice CHATID: 123456789 STATUS: SUCCESS SIGNATURE: abc123...
[2025-12-31T14:00:15Z] ACTION: /agent ADMIN: @alice CHATID: 123456789 STATUS: DENIED REASON: IP not whitelisted SIGNATURE: def456...
```

---

## Configuration Management (`src/config.js`)

### Environment Variables
```bash
# Required
TELEGRAM_GOVNOBOT_TOKEN=<bot token>

# Admin
TELEGRAM_ADMIN_USERNAME=alice
TELEGRAM_ADMIN_CHATID=123456789

# Optional
OPENAI_API_KEY=<api key>
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
AVAILABLE_MODELS=llama2,mistral,neural-chat,dolphin-mixtral

# Bot Configuration
BOT_POLL_INTERVAL=30000
BOT_MESSAGE_CHUNK_SIZE=4096
BOT_RATE_LIMIT_REQUESTS_PER_MIN=10
BOT_RATE_LIMIT_REQUESTS_PER_HOUR=100

# Data Storage
BOT_DATA_DIR=./data
BOT_BACKUP_RETENTION=10

# Logging
BOT_LOG_LEVEL=info
BOT_LOG_FILE=./data/bot.log

# Security
ADMIN_IP_WHITELIST=192.168.1.1,10.0.0.5
SH_COMMAND_WHITELIST=ls,ps,whoami
```

### Configuration Loading (`src/config.js`)
```javascript
class Config {
  constructor() {
    this.load();
  }
  
  load() {
    // Load from .env file (if exists)
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      });
    }
    
    // Validate required variables
    if (!process.env.TELEGRAM_GOVNOBOT_TOKEN) {
      throw new Error('TELEGRAM_GOVNOBOT_TOKEN environment variable required');
    }
    
    // Parse typed values
    this.telegram = {
      token: process.env.TELEGRAM_GOVNOBOT_TOKEN,
      adminUsername: process.env.TELEGRAM_ADMIN_USERNAME,
      adminChatId: parseInt(process.env.TELEGRAM_ADMIN_CHATID, 10),
      pollInterval: parseInt(process.env.BOT_POLL_INTERVAL || '30000', 10),
    };
    
    // ... more config loading
  }
}
```

---

## TDD/BDD/ADD Development Roadmap

### Methodology Overview

**Red-Green-Refactor Cycle**:
1. **Red**: Write failing test (acceptance test first)
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code quality without breaking tests

**Feature Development Process**:
1. Write **BDD feature scenario** (Given-When-Then)
2. Write **acceptance tests** (ADD) - all must fail
3. Write **unit tests** (TDD) for implementation details
4. Implement code to pass all tests
5. Refactor with confidence (tests guarantee correctness)

### Phase 1: Foundation & Core Utilities (Week 1)
**Goal**: All utility modules with 100% test coverage

#### Acceptance Criteria
```gherkin
Feature: Core utilities work reliably
  Scenario: Message chunking respects 4096 char limit
    Given I have a message of 10000 characters
    When I chunk it
    Then each chunk is <= 4096 characters
    And no characters are lost
    And no characters are duplicated

  Scenario: File locking prevents concurrent writes
    Given two processes want to write the same file
    When they both request the lock
    Then only one gets the lock
    And the other waits
    And both complete successfully
```

#### Tasks (Test-First)
- [ ] **1.1 Test Runner Setup**
  - [ ] ✅ Write `test/run-all.js` (custom test runner)
  - [ ] ✅ Create test reporting with colors
  - [ ] ✅ Support skip/only/pending tests
  - [ ] [ ] Implement code coverage calculation

- [ ] **1.2 Utility Modules (TDD)**
  - [ ] Write acceptance tests for each utility
  - [ ] Write unit tests (behavior specifications)
  - [ ] Implement modules to pass tests
  
  **Chunker** (`src/utils/chunker.js`):
  - [ ] `test/acceptance/chunker.test.js` (ADD)
  - [ ] `test/unit/chunker.test.js` (TDD)
  - [ ] Implementation
  
  **Logger** (`src/utils/logger.js`):
  - [ ] `test/acceptance/logger.test.js` (ADD)
  - [ ] `test/unit/logger.test.js` (TDD)
  - [ ] Implementation with structured logging
  
  **File Lock** (`src/storage/file-lock.js`):
  - [ ] `test/acceptance/file-lock.test.js` (ADD)
  - [ ] `test/unit/file-lock.test.js` (TDD)
  - [ ] Implementation with timeout handling

- [ ] **1.3 Configuration Module (TDD)**
  - [ ] Write unit tests for `Config` class
  - [ ] Test environment variable loading
  - [ ] Test validation of required fields
  - [ ] Implement `src/config.js`

### Phase 2: Storage & Persistence (Week 2)
**Goal**: All data storage with 100% test coverage, concurrent access safety

#### Acceptance Criteria
```gherkin
Feature: User data persists correctly
  Scenario: User conversation history is saved and restored
    Given a user has sent 5 messages
    When the bot restarts
    Then all 5 messages are available
    And they are in correct order
    And timestamps are preserved

  Scenario: Concurrent writes don't corrupt data
    Given two users message simultaneously
    When both messages are saved
    Then both are persisted
    And no data is lost
    And history is not corrupted
```

#### Tasks (Test-First)
- [ ] **2.1 History Store (TDD)**
  - [ ] Write acceptance test: `test/acceptance/history-persistence.test.js`
  - [ ] Write unit tests: `test/unit/history-store.test.js`
  - [ ] Acceptance criteria:
    - Add, load, clear messages
    - Concurrent writes with file locking
    - Corrupted file recovery
  - [ ] Implement `src/storage/history-store.js`

- [ ] **2.2 Settings Store (TDD)**
  - [ ] Write acceptance test: `test/acceptance/settings-persistence.test.js`
  - [ ] Write unit tests: `test/unit/settings-store.test.js`
  - [ ] Acceptance criteria:
    - Save, load, update settings
    - Default values
    - Validation of settings
  - [ ] Implement `src/storage/settings-store.js`

- [ ] **2.3 Backup Manager (TDD)**
  - [ ] Write acceptance test: `test/acceptance/backup-restore.test.js`
  - [ ] Write unit tests: `test/unit/backup-manager.test.js`
  - [ ] Acceptance criteria:
    - Create timestamped backups
    - Compress with zlib
    - List and restore backups
    - Retention policy (keep last N)
  - [ ] Implement `src/storage/backup-manager.js`

### Phase 3: Security (Week 3)
**Goal**: All security modules with 100% test coverage

#### Acceptance Criteria
```gherkin
Feature: Bot enforces rate limits
  Scenario: User hitting rate limit is throttled
    Given a user can make 10 requests/minute
    When they make 15 requests in 1 minute
    Then the 11th request is rejected
    And they see reset time
    And the limit resets after 1 minute

Feature: Admin actions are audited
  Scenario: All admin actions are logged and signed
    Given an admin executes /sh command
    When it completes
    Then it's logged with timestamp
    And log entry is signed with HMAC
    And signature can be verified
```

#### Tasks (Test-First)
- [ ] **3.1 Rate Limiter (TDD)**
  - [ ] Write BDD feature: `test/features/rate-limiting.feature`
  - [ ] Write acceptance test: `test/acceptance/rate-limit-enforcement.test.js`
  - [ ] Write unit tests: `test/unit/rate-limiter.test.js`
  - [ ] Implement `src/security/rate-limiter.js`

- [ ] **3.2 Admin Validator (TDD)**
  - [ ] Write unit tests: `test/unit/admin-validator.test.js`
  - [ ] Acceptance criteria:
    - Validate username and chat ID
    - IP whitelist check
    - IP blacklist check
    - Return clear error messages
  - [ ] Implement `src/security/admin-validator.js`

- [ ] **3.3 Crypto Utils (TDD)**
  - [ ] Write unit tests: `test/unit/crypto-utils.test.js`
  - [ ] Acceptance criteria:
    - Sign audit log entries
    - Verify signatures
    - Handle missing keys gracefully
  - [ ] Implement `src/security/crypto-utils.js`

### Phase 4: Telegram API & Polling (Week 4)
**Goal**: Telegram integration with mocked API, 100% test coverage

#### Acceptance Criteria
```gherkin
Feature: Bot polls Telegram API reliably
  Scenario: Bot receives and processes messages
    Given the Telegram API has 3 new messages
    When polling interval expires
    Then bot fetches all 3 messages
    And processes them in order
    And updates offset correctly

  Scenario: Bot handles API errors gracefully
    Given Telegram API returns 500 error
    When bot tries to poll
    Then bot retries with exponential backoff
    And logs the error
    And never crashes
```

#### Tasks (Test-First)
- [ ] **4.1 Telegram API Client (TDD)**
  - [ ] Write mocks: `test/mocks/telegram-api.mock.js`
  - [ ] Write unit tests: `test/unit/telegram-api-client.test.js`
  - [ ] Write acceptance tests: `test/acceptance/telegram-polling.test.js`
  - [ ] Acceptance criteria:
    - Send messages (chunked)
    - Get updates
    - Handle errors with exponential backoff
    - Respect rate limits
  - [ ] Implement `src/telegram/api-client.js`

- [ ] **4.2 Polling Loop (TDD)**
  - [ ] Write acceptance test: `test/acceptance/polling-resilience.test.js`
  - [ ] Write unit tests: `test/unit/polling.test.js`
  - [ ] Acceptance criteria:
    - Poll with configurable interval
    - Call update handler for each message
    - Handle Telegram API errors
    - Implement exponential backoff
    - Graceful shutdown on SIGINT
  - [ ] Implement `src/telegram/polling.js`

### Phase 5: AI Integration (Week 5)
**Goal**: All AI clients with 100% test coverage, fallback chain tested

#### Acceptance Criteria
```gherkin
Feature: AI fallback chain works correctly
  Scenario: Ollama is tried first
    Given Ollama is available
    When user asks a question
    Then Ollama is called first
    And response is returned

  Scenario: Falls back to OpenAI if Ollama fails
    Given Ollama is not available
    When user asks a question
    Then OpenAI API is called
    And response is returned

  Scenario: Clear error if all AI services fail
    Given no AI services are available
    When user asks a question
    Then user gets helpful error message
    And setup instructions are provided
```

#### Tasks (Test-First)
- [ ] **5.1 Ollama Client (TDD)**
  - [ ] Write mocks: `test/mocks/ollama-api.mock.js`
  - [ ] Write unit tests: `test/unit/ollama.test.js`
  - [ ] Write acceptance tests: `test/acceptance/ollama-integration.test.js`
  - [ ] Implement `src/ai/ollama.js`

- [ ] **5.2 OpenAI Client (TDD)**
  - [ ] Write mocks: `test/mocks/openai-api.mock.js`
  - [ ] Write unit tests: `test/unit/openai.test.js`
  - [ ] Write acceptance tests: `test/acceptance/openai-integration.test.js`
  - [ ] Implement `src/ai/openai.js`

- [ ] **5.3 Fallback Chain (TDD)**
  - [ ] Write BDD feature: `test/features/ai-fallback-chain.feature`
  - [ ] Write acceptance tests: `test/acceptance/ai-fallback-chain.test.js`
  - [ ] Write unit tests: `test/unit/fallback-chain.test.js`
  - [ ] Implement `src/ai/fallback-chain.js`

### Phase 6: Commands (Week 6-7)
**Goal**: All commands with 100% test coverage, realistic scenarios

#### BDD Feature Specifications

**Feature: User asks questions** (`test/features/user-asks-question.feature`)
```gherkin
Feature: User asks a question with /ask
  Scenario: User asks simple question
    Given user sends /ask "What is AI?"
    When bot processes the question
    Then bot queries AI service
    And returns answer in one message
    And saves question to history
    And saves answer to history

  Scenario: User gets response with context
    Given user has previous conversation
    When user sends /ask "Continue explaining"
    Then AI includes previous context
    And response is coherent

  Scenario: Long responses are chunked
    Given AI returns 8000 character response
    When bot sends response
    Then message is split into 2 chunks
    And both chunks are sent in order
```

#### Tasks (Test-First) - Commands

- [ ] **6.1 Public Commands (TDD)**
  - [ ] **/start command**
    - `test/acceptance/start-command.test.js`
    - `test/unit/commands/start.test.js`
    - Implementation: `src/commands/public/start.js`
  
  - [ ] **/help command**
  - [ ] **/ask command** (highest priority)
    - BDD feature: `test/features/user-asks-question.feature`
    - Acceptance: `test/acceptance/ask-command.test.js`
    - Unit: `test/unit/commands/ask.test.js`
    - Implementation: `src/commands/public/ask.js`
  
  - [ ] **/fix command**
    - BDD feature: `test/features/user-fixes-code.feature`
    - Acceptance: `test/acceptance/fix-command.test.js`
  
  - [ ] **/history command**
  - [ ] **/model command**
  - [ ] **/settings command**
  - [ ] **/stats, /status, /version commands**

- [ ] **6.2 Admin Commands (TDD)**
  - [ ] **/sh command** (with security tests)
    - BDD feature: `test/features/admin-executes-shell.feature`
    - Acceptance: `test/acceptance/sh-command.test.js`
    - Security tests: whitelist enforcement
  
  - [ ] **/agent command**
    - BDD feature: `test/features/admin-multi-step-task.feature`
  
  - [ ] Audit logging for all admin actions

- [ ] **6.3 Command Handler (TDD)**
  - [ ] Write unit tests: `test/unit/command-handler.test.js`
  - [ ] Test command routing
  - [ ] Test error handling
  - [ ] Implement: `src/commands/command-handler.js`

### Phase 7: Integration & E2E (Week 8)
**Goal**: Full integration tests, realistic workflows

#### Acceptance Criteria - Integration

```gherkin
Feature: Complete user conversation workflow
  Scenario: User has multi-turn conversation
    Given user sends /start
    When user sends /ask "First question"
    And user sends /ask "What about X?"
    And user switches model with /model llama2
    And user views history with /history
    Then all interactions are saved
    And context is preserved across messages
    And model change is respected
    And statistics are accurate
```

#### Tasks
- [ ] **7.1 Conversation Flow Tests**
  - [ ] Write acceptance test: `test/acceptance/conversation-flow.test.js`
  - [ ] Simulate realistic user interactions
  - [ ] Verify complete workflows

- [ ] **7.2 Error Recovery Tests**
  - [ ] Write acceptance test: `test/acceptance/error-recovery.test.js`
  - [ ] Test graceful degradation
  - [ ] Test service unavailability handling

- [ ] **7.3 Performance Tests**
  - [ ] Write acceptance test: `test/acceptance/performance.test.js`
  - [ ] Verify response times
  - [ ] Test under load

### Phase 8: Documentation (Week 9)
**Goal**: Complete, executable specifications

- [ ] Generate `ARCHITECTURE.md` from code and tests
- [ ] Generate `API.md` from JSDoc comments
- [ ] Create `TEST-STRATEGY.md` (this approach)
- [ ] Create `FEATURE-SPECIFICATIONS.md` (from .feature files)
- [ ] Update `README.md` with test running instructions
- [ ] Update `CONTRIBUTING.md` with TDD workflow

---

## Implementation Priorities

### Must Have (MVP)
1. ✅ Telegram polling and message sending
2. ✅ `/ask` and `/fix` commands with history
3. ✅ AI fallback (Ollama → OpenAI)
4. ✅ User persistence (history + settings)
5. ✅ Admin commands (`/sh`, `/agent`)
6. ✅ Rate limiting
7. ✅ Graceful shutdown

### Should Have
8. Audit logging with signatures
9. Backup and restore
10. `/model`, `/settings`, `/history` commands
11. Health check endpoint
12. Better error messages with setup help

### Nice to Have
13. Inline buttons for common actions
14. Voice message support
15. Image generation (`/imagine`)
16. Web dashboard
17. Prometheus metrics export

---

## Comparison: PowerShell vs Node.js

| Aspect | PowerShell | Node.js |
|--------|------------|---------|
| **Startup Time** | 1-2 seconds | 200-300ms |
| **Memory** | 200+ MB (interpreter) | 50-80 MB |
| **Cross-Platform** | Windows-first | All platforms equally |
| **Dependencies** | External (GitHub CLI, Ollama) | Only standard library |
| **Async/Await** | Limited | Native |
| **JSON Handling** | String-based | Native objects |
| **Special Characters** | Issues with `<`, `&`, etc. | None |
| **Deployment** | Complex (PowerShell 5.1+) | Single binary with pkg |
| **Learning Curve** | Steep (PowerShell specific) | More universal |
| **File I/O** | Simple | Async-friendly |

---

## Security Considerations

### `/sh` Command Restrictions
```javascript
const SH_WHITELIST = new Set([
  'ls', 'ps', 'whoami', 'date', 'pwd',
  'echo', 'cat', 'grep', 'tail'
]);

const IP_WHITELIST = process.env.ADMIN_IP_WHITELIST.split(',');

async function handleShCommand(update, args, context) {
  const { chatId, from } = update.message;
  const command = args[0];
  
  // Validate admin
  if (!isAdmin(chatId)) return deny('Not admin');
  
  // Check IP whitelist
  const clientIp = update.message.sender_ip || 'unknown';
  if (!IP_WHITELIST.includes(clientIp)) {
    logAdminAttempt(chatId, from.username, '/sh', 'DENIED_IP');
    return deny('IP not whitelisted');
  }
  
  // Check command whitelist
  if (!SH_WHITELIST.has(command)) {
    logAdminAttempt(chatId, from.username, '/sh', 'DENIED_CMD');
    return deny('Command not whitelisted');
  }
  
  // Execute and log
  logAdminAttempt(chatId, from.username, '/sh', 'EXECUTED');
  const result = await execute(command, args.slice(1));
  return sendMessage(chatId, '```\n' + result + '\n```');
}
```

### Audit Trail Format
- Signed with HMAC-SHA256
- Secret from environment variable
- Tamper detection possible
- Can be verified offline

---

## Workflow & Best Practices

### TDD Workflow (per feature)

1. **Write Acceptance Test First** (Red)
   ```bash
   $ touch test/acceptance/feature-name.test.js
   $ # Write test that will fail
   $ node test/acceptance/feature-name.test.js  # ✗ FAILS
   ```

2. **Write Unit Tests** (Still Red)
   ```bash
   $ touch test/unit/module.test.js
   $ # Write tests for helper functions
   $ node test/unit/module.test.js  # ✗ FAILS
   ```

3. **Write Minimal Implementation** (Green)
   ```bash
   $ touch src/module.js
   $ # Implement just enough to pass tests
   $ node test/run-all.js  # ✅ All pass
   ```

4. **Refactor with Confidence** (Refactor)
   ```bash
   $ # Improve code quality, performance
   $ node test/run-all.js  # ✅ Still pass - tests guard against regressions
   ```

### Code Review Checklist

- [ ] All tests pass: `node test/run-all.js`
- [ ] Acceptance tests included
- [ ] BDD feature written
- [ ] Unit tests cover edge cases
- [ ] No external dependencies added
- [ ] Error messages are helpful
- [ ] Code follows project style
- [ ] JSDoc comments on all functions

### Documentation Standards

Every feature needs:
1. **BDD Feature File** - Human-readable scenarios
2. **Acceptance Test** - Verifies complete workflow
3. **Unit Tests** - Tests for individual functions
4. **JSDoc Comments** - Clear function documentation

---

## Debugging Tests

### Common Issues & Solutions

**Test Fails Intermittently**
- Check for hardcoded timeouts
- Verify async operations complete
- Use mock services consistently

**File Lock Timeout**
- Ensure locks are released
- Check for stale lock files
- Increase timeout in tests

**Mock Data Mismatch**
- Verify mock matches real API response
- Update mocks when APIs change
- Use fixtures for consistency

### Debug Mode

```bash
# Run single test with debugging
$ node test/unit/specific.test.js

# Run with stack traces
$ node --trace-uncaught test/acceptance/test.test.js

# Check file state
$ ls -la data/history/
$ cat data/audit.log
```

---

## Comparison: TDD vs Traditional Development

| Aspect | TDD | Traditional |
|--------|-----|-------------|
| **When Tests Written** | Before code | After code |
| **Coverage** | Near 100% | Often <50% |
| **Refactoring** | Safe (tests guide) | Risky (may break) |
| **Design** | Emerges naturally | Must be planned |
| **Documentation** | Tests are docs | Must be updated |
| **Debugging** | Easier (tests isolate) | Harder (integration) |
| **Time** | Slower initially | Faster initially, slower later |
| **Confidence** | Very high | Lower |
| **Regression** | Impossible | Common |

---

## Migration Path from PowerShell

### Phase 1: Setup (Week 1)
- Create Node.js project structure
- Initialize test framework
- Set up mocks

### Phase 2: Parallel Running (Weeks 2-4)
- Implement core features with 100% tests
- Run both PowerShell and Node.js bots
- Compare responses daily
- Log any differences

### Phase 3: Validation (Week 5)
- Node.js bot handles 100% of traffic
- PowerShell as read-only fallback
- Monitor stability metrics

### Phase 4: Cutover (Week 6)
1. Stop PowerShell bot
2. Migrate main token to Node.js
3. Keep backups of old data
4. Archive PowerShell code

### Phase 5: Cleanup (Week 7+)
- Remove old PowerShell files
- Focus on Node.js enhancements
- Deploy to production

---

## Success Metrics (TDD Focus)

### Development Metrics
- ✅ **Test Coverage**: 100% of business logic
- ✅ **Acceptance Tests**: All features have ADD tests
- ✅ **Test Execution Time**: < 5 seconds for full suite
- ✅ **Build-Test-Refactor Cycle**: < 15 minutes per feature

### Quality Metrics
- ✅ **Zero Dependencies**: 0 npm packages
- ✅ **Code Style**: 100% consistency (linted by tests)
- ✅ **Documentation**: Every function documented
- ✅ **Error Messages**: User-friendly and actionable

### Reliability Metrics
- ✅ **Uptime**: 99%+ in production
- ✅ **Recovery Time**: < 5 minutes for any error
- ✅ **Data Corruption**: 0 incidents
- ✅ **Regressions**: 0 bugs from refactoring

---

## Known Limitations

### Current Limitations
1. No mocking framework (custom mocks only)
2. No parallel test execution (single-threaded)
3. Basic test output (no detailed reports)
4. No coverage reporting tools
5. Manual fixture management

### These Are Intentional
- No external dependencies (keep project lightweight)
- Clarity over convenience (code is readable)
- Educational approach (learn Node.js concepts)

### Future Enhancements (Optional)
- Test output formatter (TAP, JSON)
- Coverage calculation
- Test grouping/parallelization
- Performance profiling
- CI/CD integration

---

## Extending the Test Framework

### Adding a Custom Assertion

```javascript
// test/lib/assertions.js
function assertArrayEquals(actual, expected) {
  console.assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

module.exports = { assertArrayEquals };
```

### Using in Tests

```javascript
const { assertArrayEquals } = require('../lib/assertions');

const result = [1, 2, 3];
assertArrayEquals(result, [1, 2, 3]);  // ✓
```

---

## Conclusion

This plan adopts **TDD/BDD/ADD methodology** throughout:

### TDD (Test-Driven Development)
- All code is driven by failing tests
- Tests are written before implementation
- Red-Green-Refactor cycle guarantees quality

### BDD (Behavior-Driven Development)
- Features written in human-readable Gherkin syntax
- Scenarios describe expected behavior
- Non-technical stakeholders can understand tests

### ADD (Acceptance-Driven Development)
- User acceptance tests drive feature completion
- Features complete only when tests pass
- Integration tests validate entire workflows

### Benefits
1. **100% Coverage**: Every feature has tests
2. **Zero Defects**: Regressions are impossible
3. **Clear Specifications**: Tests are executable specs
4. **Confidence**: Refactoring is safe
5. **Maintainability**: New developers read tests first

### Implementation
- **8-week development cycle**
- **9 phases** from foundation to production
- **Zero external dependencies**
- **Complete documentation** (tests + docs)
- **Cross-platform** support (Windows, macOS, Linux)

The Node.js version with TDD/BDD/ADD methodology will be more robust, maintainable, and reliable than the original PowerShell version.

---

*Plan created: 2025-12-31*  
*Methodology: Test-Driven Development (TDD)*  
*Specification: Behavior-Driven Development (BDD)*  
*Validation: Acceptance-Driven Development (ADD)*  
*Next review: 2026-01-07*
