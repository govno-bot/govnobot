# GovnoBot Node.js - Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GovnoBot Node.js                             │
│                   Zero-Dependency Telegram Bot                      │
│                     TDD/BDD/ADD Methodology                         │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                         CURRENT ARCHITECTURE
                         (Phase 1.1 Complete)
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                          TEST FRAMEWORK                             │
├─────────────────────────────────────────────────────────────────────┤
│  test/run-all.js  ✅                                                │
│  • Custom test runner (no external deps)                            │
│  • Assertions: assert, assertEqual, assertDeepEqual, assertThrows   │
│  • ANSI colored output                                              │
│  • Automatic test discovery                                         │
│  • Summary reporting                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
┌───────────────────▼────────────┐  ┌──────────────▼──────────────────┐
│    UTILITIES (Phase 1.1)       │  │   CONFIGURATION (Phase 1.1)     │
├────────────────────────────────┤  ├─────────────────────────────────┤
│  src/utils/chunker.js  ✅      │  │  src/config.js  ✅             │
│  • Split long messages         │  │  • Load .env files              │
│  • 4096 char limit             │  │  • Type-safe getters            │
│  • Smart newline splitting     │  │  • Validation                   │
│  • Unicode support             │  │  • Safe logging                 │
│  • 10 tests                    │  │  • Singleton pattern            │
│                                │  │  • 10 tests                     │
└────────────────────────────────┘  └─────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                         PLANNED ARCHITECTURE
                        (Phases 1.2 - 8)
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                         ENTRY POINT                                 │
├─────────────────────────────────────────────────────────────────────┤
│  src/index.js  ⏳ (Phase 6)                                         │
│  • Initialize configuration                                         │
│  • Start polling loop                                               │
│  • Handle graceful shutdown                                         │
│  • Error recovery                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
┌───────────────────▼────────────┐  ┌──────────────▼──────────────────┐
│  TELEGRAM API (Phase 4)        │  │  AI INTEGRATION (Phase 5)       │
├────────────────────────────────┤  ├─────────────────────────────────┤
│                                 │  │  • Context Window Management:   │
│                                 │  │    - Last N messages (default: 8)│
│                                 │  │    - Summary memory (recent assistant answers)│
│                                 │  │    - Pinned system prompt (user/system)│
│                                 │  │  • Prompt assembly for LLMs     │
│  src/telegram/                 │  │  src/ai/                        │
│  • api-client.js  ⏳           │  │  • ollama.js  ⏳                │
│  • polling.js  ⏳              │  │  • openai.js  ⏳                │
│                                │  │  • fallback-chain.js  ⏳        │
│  Responsibilities:             │  │                                 │
│  • HTTP to Telegram API        │  │  Responsibilities:              │
│  • getUpdates (long polling)   │  │  • Query Ollama first           │
│  • sendMessage (chunked)       │  │  • Fallback to GitHub Copilot   │
│  • editMessage                 │  │  • Fallback to OpenAI           │
│  • Exponential backoff         │  │  • Context management           │
└────────────────────────────────┘  └─────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                       COMMAND HANDLER (Phase 6)                      │
├─────────────────────────────────────────────────────────────────────┤
│  src/commands/command-handler.js  ⏳                                │
│  • Route commands                                                    │
│  • Parse arguments                                                   │
│  • Permission checking                                               │
│  • Error handling                                                    │
└─────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐  ┌────────▼─────────┐
│ PUBLIC COMMANDS  │  │ ADMIN COMMANDS   │
├──────────────────┤  ├──────────────────┤
│  src/commands/   │  │  src/commands/   │
│    public/       │  │    admin/        │
│                  │  │                  │
│  • start.js  ⏳  │  │  • sh.js  ⏳     │
│  • help.js  ⏳   │  │  • agent.js  ⏳  │
│  • ask.js  ⏳    │  │  • audit.js  ⏳  │
│  • fix.js  ⏳    │  │                  │
│  • model.js  ⏳  │  │                  │
│  • history.js ⏳ │  │                  │
│  • settings.js⏳ │  │                  │
│  • stats.js  ⏳  │  │                  │
└──────────────────┘  └──────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
    ┌───────────────┼───────────────┬──────────────────┐
    │               │               │                  │
┌───▼──────┐  ┌────▼─────┐  ┌──────▼─────┐  ┌────────▼────────┐
│ STORAGE  │  │ SECURITY │  │  UTILITIES  │  │  CONFIGURATION  │
│ (Phase2) │  │ (Phase3) │  │  (Phase1.2) │  │   (Phase 1.1)   │
├──────────┤  ├──────────┤  ├─────────────┤  ├─────────────────┤
│ storage/ │  │security/ │  │   utils/    │  │  config.js  ✅  │
│          │  │          │  │             │  │                 │
│history-  │  │rate-     │  │chunker.js✅ │  │• .env parser    │
│store ⏳  │  │limiter⏳ │  │logger.js ⏳ │  │• Validation     │
│          │  │          │  │error-       │  │• Type safety    │
│settings- │  │admin-    │  │handler.js⏳ │  │• 10 tests       │
│store ⏳  │  │validator⏳│  │             │  │                 │
│          │  │          │  │             │  │                 │
│backup-   │  │crypto-   │  │             │  │                 │
│manager⏳ │  │utils ⏳  │  │             │  │                 │
│          │  │          │  │             │  │                 │
│file-     │  │          │  │             │  │                 │
│lock ⏳   │  │          │  │             │  │                 │
└──────────┘  └──────────┘  └─────────────┘  └─────────────────┘


═══════════════════════════════════════════════════════════════════════
                           DATA FLOW
═══════════════════════════════════════════════════════════════════════

User sends message to Telegram
            │
            ▼
┌─────────────────────────┐
│  Telegram API Polling   │  (Phase 4)
│  • Long poll (30s)      │
│  • Get updates          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Command Handler       │  (Phase 6)
│   • Parse command       │
│   • Check permissions   │
│   • Route to handler    │
└───────────┬─────────────┘
            │
            ├─────────────────────┐
            │                     │
            ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Public Command     │  │  Admin Command      │
│  (e.g., /ask)       │  │  (e.g., /sh)        │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Load User History  │  │  Validate Admin     │
│  (Phase 2)          │  │  (Phase 3)          │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Query AI           │  │  Execute Command    │
│  (Phase 5)          │  │  Log to Audit       │
│  • Try Ollama       │  │  (Phase 3)          │
│  • Fallback chain   │  │                     │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Save to History    │  │  Return Result      │
│  (Phase 2)          │  │                     │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────────────────────┐
│  Chunk Message (Phase 1.1) ✅       │
│  • Split at 4096 chars              │
│  • Smart newline splitting          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Send to Telegram                   │
│  (Phase 4)                          │
└─────────────────────────────────────┘
                 │
                 ▼
         User receives response


═══════════════════════════════════════════════════════════════════════
                        TESTING ARCHITECTURE
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID (TDD/BDD/ADD)                     │
└─────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │  Acceptance     │  (Phase 7)
                        │  Tests (ADD)    │  ⏳ Planned
                        │  Full workflows │
                        └────────┬────────┘
                                 │
                     ┌───────────┴───────────┐
                     │   Integration Tests   │  (Phase 7)
                     │   Component combos    │  ⏳ Planned
                     └──────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    │     Unit Tests (TDD)   │
                    │     20 tests ✅        │
                    │     100% coverage      │
                    │                        │
                    │  • chunker.test.js     │
                    │  • config.test.js      │
                    │  • (more coming...)    │
                    └────────────────────────┘

Test Structure:
┌─────────────────────────────────────┐
│  test/                              │
│  ├── run-all.js  ✅                 │  Custom runner
│  ├── unit/                          │  TDD tests
│  │   ├── chunker.test.js  ✅       │  10 tests
│  │   └── config.test.js  ✅        │  10 tests
│  ├── acceptance/  ⏳                │  ADD tests
│  ├── features/  ⏳                  │  BDD specs
│  └── mocks/  ⏳                     │  Test doubles
└─────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                      DEPLOYMENT ARCHITECTURE
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                         SINGLE PROCESS                               │
├─────────────────────────────────────────────────────────────────────┤
│  node src/index.js                                                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Configuration (.env)                                        │  │
│  │  • Telegram token                                            │  │
│  │  • Admin settings                                            │  │
│  │  • Ollama URL                                                │  │
│  │  • Rate limits                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Data Storage (File-based)                                   │  │
│  │  • data/history/{chatId}.json                                │  │
│  │  • data/settings/{chatId}.json                               │  │
│  │  • data/backups/backup_{timestamp}.tar.gz                    │  │
│  │  • data/audit.log (signed)                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Logging                                                     │  │
│  │  • Console output (development)                              │  │
│  │  • File logging (production)                                 │  │
│  │  • Structured logs (JSON)                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                         KEY DESIGN DECISIONS
═══════════════════════════════════════════════════════════════════════

1. ZERO DEPENDENCIES
   • Only Node.js standard library
   • No npm packages
   • Faster, more secure, educational

2. TEST-DRIVEN DEVELOPMENT
   • Tests written BEFORE implementation
   • 100% test coverage goal
   • Executable specifications

3. SINGLE PROCESS
   • No background workers
   • No message queues
   • Simple deployment

4. FILE-BASED STORAGE
   • No database needed
   • JSON files with file locking
   • Compressed backups

5. SYNCHRONOUS API CALLS
   • Long polling (30s timeout)
   • Native Node.js http/https
   • Exponential backoff on errors

6. CROSS-PLATFORM
   • Works on Windows, macOS, Linux
   • Path handling with path module
   • No OS-specific commands


═══════════════════════════════════════════════════════════════════════

Legend:
  ✅ = Implemented and tested (Phase 1.1)
  ⏳ = Planned (Phases 1.2-8)
  🔄 = In progress

Current Status: Phase 1.1 Complete
Next Phase: 1.2 (Logger, File Lock, Error Handler)
Total Progress: 11% (1/9 phases)

═══════════════════════════════════════════════════════════════════════
```
