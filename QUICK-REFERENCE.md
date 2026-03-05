# GovnoBot Node.js - Quick Reference Card

## ⚡ Quick Commands

```bash
node init.js          # Initialize + verify + test
node demo.js          # See working examples
npm test              # Run all tests
npm run demo          # Same as node demo.js
npm run bootstrap     # Reset directory structure
```

---

## 📁 File Locations

```
src/utils/chunker.js     # Message splitting (4096 limit)
src/config.js            # Configuration loading
test/run-all.js          # Custom test runner
test/unit/*.test.js      # Unit tests
.env                     # Your config (copy from .env.example)
```

---

## 🧪 Writing Tests (TDD)

### 1. Create Test File

```javascript
// test/unit/my-module.test.js
async function run(runner) {
  console.log('\n🔧 Testing My Module');
  
  const myModule = require('../../src/my-module');
  
  // Test cases
  runner.assert(myModule.doSomething(), 'Does something');
  runner.assertEqual(myModule.add(1, 2), 3, 'Adds numbers');
  runner.assertDeepEqual(myModule.getArray(), [1,2,3], 'Returns array');
  
  // Test error handling
  await runner.assertThrows(
    () => myModule.invalid(),
    Error,
    'Throws on invalid input'
  );
}

module.exports = { run };
```

### 2. Run Tests (Should Fail)

```bash
npm test  # ❌ Module doesn't exist yet
```

### 3. Implement Module

```javascript
// src/my-module.js
function doSomething() { return true; }
function add(a, b) { return a + b; }
function getArray() { return [1, 2, 3]; }
function invalid() { throw new Error('Invalid'); }

module.exports = { doSomething, add, getArray, invalid };
```

### 4. Run Tests (Should Pass)

```bash
npm test  # ✅ All tests pass
```

---

## 🔧 Test Runner API

```javascript
// Inside test run() function:

runner.assert(condition, 'message')
// ✓ Passes if condition is true

runner.assertEqual(actual, expected, 'message')
// ✓ Passes if actual === expected

runner.assertDeepEqual(actual, expected, 'message')  
// ✓ Passes if JSON.stringify matches

await runner.assertThrows(fn, ErrorType, 'message')
// ✓ Passes if fn() throws ErrorType
```

---

## 📦 Chunker Module

```javascript
const chunker = require('./src/utils/chunker');

// Split long messages
const chunks = chunker.chunk('Very long message...', 4096);
// Returns: ['chunk1', 'chunk2', ...]

// Each chunk <= 4096 chars
// No data loss
// Smart splitting at newlines
```

---

## ⚙️ Config Module

```javascript
const { getConfig } = require('./src/config');

const config = getConfig();

// Access configuration
config.telegram.token         // Bot token
config.telegram.adminUsername // Admin user
config.ollama.url            // Ollama URL
config.ollama.model          // Current model
config.bot.messageChunkSize  // 4096
config.data.dir              // './data'

// Validate (throws if invalid)
config.validate();

// Safe summary (no secrets)
const summary = config.getSummary();
console.log(summary);
```

---

## 🌍 Environment Variables

```bash
# Required
TELEGRAM_GOVNOBOT_TOKEN=your_bot_token

# Admin
TELEGRAM_ADMIN_USERNAME=your_username
TELEGRAM_ADMIN_CHATID=your_chat_id

# Optional
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
OPENAI_API_KEY=your_key

# Limits
BOT_RATE_LIMIT_REQUESTS_PER_MIN=10
BOT_RATE_LIMIT_REQUESTS_PER_HOUR=100

# Storage
BOT_DATA_DIR=./data
```

Copy `.env.example` to `.env` and customize.

---

## 📈 Current Status

### ✅ Phase 1.1 Complete
- [x] Test runner
- [x] Chunker module (10 tests)
- [x] Config module (10 tests)
- [x] Documentation

### 🔄 Phase 1.2 Next
- [ ] Logger module
- [ ] File lock module
- [ ] Error handler

### ⏳ Future Phases
- [ ] Storage (Phase 2)
- [ ] Security (Phase 3)
- [ ] Telegram API (Phase 4)
- [ ] AI Integration (Phase 5)
- [ ] Commands (Phase 6)
- [ ] Integration tests (Phase 7)
- [ ] Docs (Phase 8)

---

## 🚫 Zero Dependencies

This project uses **ONLY** Node.js built-ins:

```javascript
const fs = require('fs');           // File system
const path = require('path');       // Paths
const http = require('http');       // HTTP (future)
const https = require('https');     // HTTPS (future)
const crypto = require('crypto');   // Crypto (future)
const zlib = require('zlib');       // Compression (future)

// ❌ NO external npm packages!
```

---

## 🐛 Troubleshooting

### Module not found
```bash
node bootstrap.js  # Reorganize files
```

### Tests failing
```bash
# Read the error message
# Fix the implementation
npm test
```

### Reset everything
```bash
node bootstrap.js  # Reset structure
npm test           # Verify
```

---

## 📚 More Info

- **Getting Started:** [GETTING-STARTED.md](GETTING-STARTED.md)
- **Progress:** [PROGRESS.md](PROGRESS.md)  
- **Full Plan:** [govnoplan.node.md](govnoplan.node.md)
- **Summary:** [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)

---

## 🎯 TDD Workflow

```
1. Write Test (RED)     → npm test (fails)
2. Implement (GREEN)    → npm test (passes)
3. Refactor (REFACTOR)  → npm test (still passes)
4. Repeat!
```

---

## 💡 Tips

- **Run tests often** - Catch errors early
- **Write tests first** - Clarify requirements
- **Small commits** - Easy to review and revert
- **Read the tests** - They document behavior
- **Use the demo** - See working examples

---

**Happy Coding!** 🚀

---

*Quick Reference v1.0 - Phase 1.1*
