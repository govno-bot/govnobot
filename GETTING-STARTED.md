# Getting Started with GovnoBot Node.js

## Quick Start (3 Commands)

```bash
# 1. Initialize the project
node init.js

# 2. Run the demo
node demo.js

# 3. View progress
cat PROGRESS.md
```

That's it! The implementation is running with zero npm dependencies.

---

## Detailed Setup

### Prerequisites

- Node.js 14.0.0 or higher (check: `node --version`)
- No other dependencies needed!

### Step-by-Step Initialization

#### 1. Bootstrap the Project Structure

```bash
node bootstrap.js
```

This will:
- Create all necessary directories (src/, test/, data/)
- Move source files to proper locations
- Set up .gitignore
- Create placeholder files

Expected output:
```
🚀 GovnoBot Node.js - Initial Setup

📁 Creating directory structure...
  ✓ src/telegram
  ✓ src/ai
  ...
📦 Organizing files...
  ✓ test-runner.js → test/run-all.js
  ...
✅ Setup complete!
```

#### 2. Run Tests (TDD Verification)

```bash
npm test
# or: node test/run-all.js
```

Expected output:
```
GovnoBot Test Runner
============================================================
Found 2 test file(s)

Running: test/unit/chunker.test.js
📦 Testing Message Chunker
  ✓ chunk() returns an array
  ✓ Short message has 1 chunk
  ...

Running: test/unit/config.test.js
⚙️  Testing Configuration Module
  ✓ Can create Config instance
  ...

============================================================
Test Summary
============================================================
Total:   20
Passed:  20
Failed:  0
Duration: 45ms
============================================================

✓ All tests passed
```

#### 3. Explore the Demo

```bash
npm run demo
# or: node demo.js
```

This shows live examples of:
- Message chunking (handling Telegram's 4096 char limit)
- Configuration loading (.env parsing without dependencies)
- How the modules work in practice

#### 4. Configure for Your Bot (Optional)

```bash
# Copy the example configuration
cp .env.example .env

# Edit with your tokens
# Windows: notepad .env
# macOS/Linux: nano .env
```

Required settings:
```env
TELEGRAM_GOVNOBOT_TOKEN=your_actual_bot_token_here
TELEGRAM_ADMIN_USERNAME=your_telegram_username
```

Get a bot token from [@BotFather](https://t.me/botfather) on Telegram.

---

## Understanding the Structure

```
govnobot/
├── src/                      # Source code (TDD implemented)
│   ├── utils/
│   │   └── chunker.js       # ✅ Message splitting (20 tests)
│   └── config.js            # ✅ Configuration (20 tests)
│
├── test/                     # All tests (TDD/BDD/ADD)
│   ├── run-all.js           # ✅ Custom test runner (no deps!)
│   └── unit/
│       ├── chunker.test.js  # ✅ 10 test cases
│       └── config.test.js   # ✅ 10 test cases
│
├── data/                     # Runtime data
│   ├── history/             # User conversations
│   ├── settings/            # User preferences
│   └── backups/             # Automated backups
│
├── init.js                   # Complete initialization
├── bootstrap.js             # Directory setup only
├── demo.js                  # Live examples
└── package.json             # Zero dependencies!
```

---

## Development Workflow

### Running Tests (Continuously)

```bash
# Run all tests
npm test

# Watch for changes and re-run (manual)
# Just run: npm test
# after each change
```

### Adding a New Module (TDD Approach)

1. **Write the test first** (Red):
   ```bash
   # Create test file
   touch test/unit/my-module.test.js
   
   # Write failing tests
   # Run and verify they fail
   npm test
   ```

2. **Implement the module** (Green):
   ```bash
   # Create module file
   touch src/my-module.js
   
   # Write minimal code to pass tests
   npm test  # Should pass now!
   ```

3. **Refactor** (Refactor):
   ```bash
   # Improve code quality
   # Tests ensure nothing breaks
   npm test  # Still passing!
   ```

---

## Available Scripts

```bash
npm run init      # Complete initialization + tests
npm run bootstrap # Set up directory structure
npm run demo      # Run live examples
npm test          # Run all tests
npm start         # Start bot (when ready)
```

Or run directly:

```bash
node init.js           # Full setup
node bootstrap.js      # Directories only
node demo.js           # See modules in action
node test/run-all.js   # Run tests
```

---

## Current Implementation Status

### ✅ Completed (Phase 1.1)

- [x] Custom test runner (zero dependencies)
- [x] Message chunker (4096 char limit handling)
- [x] Configuration module (.env parsing)
- [x] 20 passing tests (100% TDD coverage)
- [x] Project structure
- [x] Documentation

### 🔄 In Progress (Phase 1.2)

- [ ] Logger module
- [ ] File lock module
- [ ] Error handler module

### ⏳ Upcoming (Phases 2-8)

- [ ] Storage & persistence (Phase 2)
- [ ] Security modules (Phase 3)
- [ ] Telegram API integration (Phase 4)
- [ ] AI integration (Ollama, OpenAI) (Phase 5)
- [ ] Bot commands (Phase 6)
- [ ] Integration tests (Phase 7)
- [ ] Documentation (Phase 8)

See [govnoplan.node.md](govnoplan.node.md) for the complete roadmap.

---

## Testing Philosophy

Every module follows **Test-Driven Development (TDD)**:

1. ✅ **Tests written FIRST** (before implementation)
2. ✅ **All tests passing** (no broken tests committed)
3. ✅ **100% coverage** (every function tested)
4. ✅ **Edge cases covered** (null, empty, large inputs)

Example test structure:
```javascript
// test/unit/my-module.test.js
async function run(runner) {
  const module = require('../../src/my-module');
  
  runner.assertEqual(module.add(1, 2), 3, 'Adds two numbers');
  runner.assert(module.isValid('test'), 'Validates input');
}

module.exports = { run };
```

---

## Troubleshooting

### "Module not found" errors

Run bootstrap to organize files:
```bash
node bootstrap.js
```

### Tests are failing

This is expected during TDD! Fix the implementation:
1. Look at which test failed
2. Fix the code in `src/`
3. Run `npm test` again

### Want to reset everything

```bash
node bootstrap.js  # Reorganize files
npm test           # Verify tests pass
```

---

## Next Steps

1. **Review the plan**: Read [govnoplan.node.md](govnoplan.node.md)
2. **Check progress**: Read [PROGRESS.md](PROGRESS.md)
3. **Run the demo**: `npm run demo`
4. **Add more modules**: Follow the TDD workflow
5. **Contribute**: Write tests first, then implement!

---

## Zero Dependencies Philosophy

This project uses **ONLY** Node.js standard library:

- ✅ `fs` - File system operations
- ✅ `path` - Path handling
- ✅ `http`/`https` - HTTP requests
- ✅ `crypto` - Cryptographic functions
- ✅ `zlib` - Compression
- ❌ No `express`, `axios`, `dotenv`, `jest`, etc.

**Why?**
- Faster startup
- Smaller memory footprint
- No security vulnerabilities from dependencies
- Educational value (learn Node.js internals)
- Ultimate portability

---

## Getting Help

1. **Check the docs**: All files have extensive comments
2. **Run the demo**: See working examples
3. **Read the tests**: Tests document expected behavior
4. **Review the plan**: [govnoplan.node.md](govnoplan.node.md)

---

## License

MIT - Internal project

---

**Ready to build a production-grade Telegram bot with zero dependencies!** 🚀
