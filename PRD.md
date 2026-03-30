# GovnoBot Node.js

## Overview
A production-grade, zero-dependency Telegram AI bot rewritten from PowerShell to Node.js, following strict TDD/BDD/ADD methodology. The project aims for 100% test coverage, cross-platform support, and educational value by using only Node.js built-in modules.

> **⚠️ Important:** Always make edits to `PRD.md` as the *final step* in your workflow. Ensure all implementation and testing are complete before updating this document to reflect the final, verified state of the project.

## Tasks
- [x] **Proactive Agent Mode:** Allow the bot to initiate conversations with users based on triggers, events, or an internal "mood." (Fixed missing initialization in entry point).
- [x] **Advanced Agentic Loop:** Implement a continuous, self-prompting evaluation loop where the bot formulates its own goals, checks constraints, and queries the environment or users without explicit prompting.
- [x] **Notepad & Todo-List Memory:** Give the bot a scratchpad / todo-list to persist its running thoughts, planned autonomous actions, and multi-step reasoning across polling/restart cycles.
- [x] **Self-Reflection & Task Breakdown:** When given an ambiguous goal, the bot uses its notepad to break down the task, schedule execution via the reminder/scheduler subsystem, and follow up proactively.
- [x] **Scheduled Messages & Reminders:** Implement a `/remind <time> <message>` command.
- [x] **Health Check & Error Telemetry:** Implement `/logs` command.
- [x] **Conversation Personalities:** Allow users to set the bot's personality (e.g., `/persona pirate`, `/persona therapist`).
- [x] **Inline AI Queries:** Allow the bot to respond when mentioned directly in a chat without a command prefix.
- [x] **Game Master Mode (Phased Approach):** Stateless, improv storytelling (`/gm <scenario>`) and a stateful campaign system.
- [x] **Image Generation (with proper architecture):** `/imagine <prompt>` command.
- [x] **Voice Message Transcription:** Transcribe user voice messages and feed them to the AI.
- [x] Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.
- [x] Implement a strategy for context window management (e.g., "last N messages", summary memory, pinned system context).
- [x] **Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.**
- [x] Implement advanced moderation and abuse detection (AI-powered, configurable, admin review queue).
- [x] Research and implement multi-turn context window management (summarization, pinning, user control).
- [x] Build a real-time analytics dashboard for admin (usage, errors, model stats, user activity).
- [x] "abuse detection" was a dumb idea. undo it. 
- [x] **Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.**
- [x] Research and implement AI streaming responses (token-by-token, partials, user abort).
- [x] Explore multi-user collaborative sessions (shared notepad, group tasks, voting).
compliance for all storage and logs.
- [x] Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.
- [x] Implement plugin sandboxing and isolation for untrusted code (secure VM, resource limits, audit logging).
- [x] Add per-user persistent preferences (theme, verbosity, notification settings, etc.).
- [x] Research and implement GDPR/data privacy compliance for all storage and logs.
- [x] Add support for custom user-defined commands/macros (per-user or per-group).
- [x] Explore integration with external knowledge bases (e.g., Wikipedia, WolframAlpha, custom corpora).
- [x] Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.
- [x] Research and implement automated regression testing for all plugins and user-defined macros.
- [x] Explore support for ephemeral, privacy-first chat sessions (no persistent storage, auto-delete on session end).
- [x] Investigate integration with calendar APIs (Google Calendar, Outlook) for advanced reminders and scheduling.
- [x] Add support for multi-modal input/output (images, files, structured forms) in chat.
- [x] Research and implement a plugin marketplace or sharing system for user-created macros/plugins.
- [x] `progress.txt` is too long. backup it and remove old records.
- [x] Continue R&D, add at least 6 tasks to this list, the last one is the copy of this one.
- [x] GDPR/data privacy compliance was an extremely DUMB idea. Replace it with Copy-Paste Church Manifest.
- [x] Explore integration with decentralized identity (DID) and verifiable credentials for user authentication and privacy.
- [x] Research and prototype conversational memory graphs for richer, long-term context retention.
- [x] Investigate real-time collaborative editing of notepad/todo (multi-user, conflict resolution, CRDTs).
- [x] Research and implement automated self-healing/recovery for failed jobs, reminders, or plugin crashes.
- [x] Continue R&D, focus on wikipedia feature, add at least 6 tasks to this list, the last one is the copy of this one.

## Wikipedia Feature R&D Tasks
- [x] Implement `/wiki <topic>` command: fetch and return a concise summary from Wikipedia for a given topic, with proper error handling and fallback if the topic is not found.
- [x] Add support for multi-language Wikipedia queries, allowing users to specify a language or auto-detect based on user settings.
- [x] Integrate Wikipedia article section selection: allow users to request specific sections (e.g., `/wiki Quantum Computing#History`).
- [x] Implement Wikipedia disambiguation handling: if a topic is ambiguous, present a list of possible articles for user selection.
 - [x] Add inline Wikipedia lookup: when a user mentions a topic in conversation (not as a command), the bot can optionally offer a brief Wikipedia summary inline.
- [x] Research and implement Wikipedia caching and rate limiting to avoid excessive API calls and improve performance.


## List of interesting topics/categories (for wiki)
- Math
- Phisics
- Chemestry
- Microbiology
- IT/IT-Science
- Science in general
- Tecnologies
- Mechanisms
- Open Source Software
- Programming Languages
- Data Science & Machine Learning
- Electronics
- Robotics
- Cognitive Science
- Artificial Intelligence
- Astrophysics
- Quantum Computing
- Bioinformatics
- Computational Linguistics
- Human-Computer Interaction
- Security & Cryptography


### Macro Feature (User-Defined Commands)

Status: Complete as of 2026-03-30. Users and groups can now define, list, and delete custom macros/commands via `/macro add`, `/macro del`, and `/macro list`. Macros are stored per-user/group in `data/macros/`, expanded at runtime, and fully covered by unit tests. All tests pass. See `test/unit/macro-store.test.js` and `test/unit/command-macro.test.js` for details.

## Implementation Status

### Core Modules
- [x] Implement Logger Module (test/unit/logger.test.js, src/utils/logger.js)
- [x] Implement File Lock Module (test/unit/file-lock.test.js, src/storage/file-lock.js)
- [x] Implement Error Handler Module (test/unit/error-handler.test.js, src/utils/error-handler.js)
- [x] Implement History Store (test/unit/history-store.test.js, src/storage/history-store.js)
- [x] Implement Settings Store (test/unit/settings-store.test.js, src/storage/settings-store.js)
- [x] Implement Backup Manager (test/unit/backup-manager.test.js, src/storage/backup-manager.js)

### Security & AI
- [x] Implement Rate Limiter (test/unit/rate-limiter.test.js, src/security/rate-limiter.js)
- [x] Implement Admin Validator (test/unit/admin-validator.test.js, src/security/admin-validator.js)
- [x] Implement Crypto Utils (test/unit/crypto-utils.test.js, src/security/crypto-utils.js)
- [x] Implement Telegram API Client (test/unit/telegram-api-client.test.js, src/telegram/api-client.js)
- [x] Implement Polling Loop (test/unit/polling.test.js, src/telegram/polling.js)
- [x] Implement Ollama Client (test/unit/ollama.test.js, src/ai/ollama.js)
- [x] Implement OpenAI Client (test/unit/openai.test.js, src/ai/openai.js)
- [x] Implement Fallback Chain (test/unit/fallback-chain.test.js, src/ai/fallback-chain.js)

### LLM Provider Evaluation

A concise evaluation of alternative local and remote LLM providers and recommended fallback strategies:

- **llama.cpp (local, quantized models)**: Pros: runs offline, good privacy, low latency on CPU when models are quantized; cost-free once set up; wide community tooling. Cons: model sizes and quality vary; may require GPU for larger/faster models; setup and quantization tooling can be complex. Good fit for privacy-sensitive deployments and disconnected environments.

- **Local Ollama (local HTTP API)**: Pros: simple local server with model management and HTTP API; supports multiple models and is easy to integrate (already implemented client exists). Cons: requires local resources and licensing considerations for some models; maintenance of the service process required. Good fit when a local, production-friendly HTTP interface is desired.

- **Remote providers (OpenAI, hosted endpoints)**: Pros: highest-quality models, managed service, predictable API and SLAs. Cons: cost, latency, and privacy/trust concerns.

- **Fallback & resilience strategies (recommended)**:
    - Prefer local inference first (llama.cpp or local Ollama) when a model is available and healthy to reduce cost and latency.
    - Fall back to a remote provider (OpenAI) when local is unavailable, timed out, or the requested model is not present.
    - Keep a `FallbackChain` (already in codebase) with: provider health checks, timeouts, retry limits, and circuit-breaker behavior to avoid cascading failures.
    - Implement model discovery & capability reporting (e.g., `listModels()`), so `/model` UI shows both local and remote options.
    - Add metrics and telemetry (latency, errors, costs) per-provider to drive automated selection policies.
    - Cache short-lived responses and use batching where appropriate to reduce rate usage and cost.

These recommendations align with the existing `FallbackChain` implementation; next steps (if desired) are adding provider health probes, dynamic model scoring, and a preference policy favoring local models when latency/cost/quality thresholds are met.

### Commands & Finalization
- [x] Implement Command Handler (test/unit/command-handler.test.js, src/commands/command-handler.js)
- [x] Implement Public Commands: /start, /help, /ask, /fix, /history, /model, /settings, /stats, /status, /version
- [x] Implement Admin Commands: /sh, /agent
- [x] Write Integration & E2E Tests (Phase 7)
- [x] Complete Documentation Phase (ARCHITECTURE.md, API.md, TEST-STRATEGY.md, etc.)
- [x] Verify admin notifications (Env vars: TELEGRAM_GOVNOBOT_TOKEN, etc.)

## Bug Fixes
- [x] **Proactive Agent Initialization:** Fixed a bug where `ProactiveAgent` was completely missing from the new `src/index.js` entry point. Even though the module was fully implemented, it was silently ignored during start-up, resulting in 24h+ runs with no signs of proactive behavior. The agent is now properly instantiated with `config.telegram.adminChatId` and started concurrently with the bot's scheduled background jobs.

## Technical Details

*   **Runtime**: Node.js (Latest LTS recommended).
*   **Dependencies**: Zero external dependencies. Uses only built-in modules (`fs`, `http`, `https`, `crypto`, `path`, `child_process`, etc.).
*   **Persistence**: JSON-based file storage with atomic write and file locking mechanisms to prevent data corruption.
*   **Architecture**: Modular, service-based architecture with dependency injection for simplified testing.
*   **Platform**: Cross-platform (Windows, macOS, Linux).

## User Interaction Flows

The following outlines the main user interaction flows for GovnoBot. Each flow is covered by automated tests and is designed to be clear, predictable, and user-friendly.

- **Start/Help:**
    - `/start` — User receives a welcome message and usage instructions.
    - `/help` — User receives a list of all available commands and their descriptions.
- **Ask a Question:**
    - `/ask <question>` — User receives an AI-generated answer. Long answers are split into multiple messages. If the AI service is unavailable, a friendly error is returned.
- **Model Selection:**
    - `/model` — User sees available models and their current selection.
    - `/model <name>` — User changes the model. Invalid models trigger an error and a list of valid options.
- **Conversation History:**
    - `/history` — User receives recent conversation history.
    - `/history clear` — User clears their history and receives confirmation.
- **Settings Management:**
    - `/settings` — User views current settings.
    - `/settings <key> <value>` — User updates a setting. Invalid keys/values return errors and valid options.
- **Status/Version:**
    - `/status` — User receives uptime, model, and health info.
    - `/version` — User receives the current version.
- **Rate Limiting:**
    - If a user exceeds rate limits, they receive a warning and are blocked until the window resets.
- **Admin Actions:**
    - `/sh <command>` (admin only) — Executes a shell command and returns output. Non-admins receive an error.
    - All admin actions are logged for audit purposes.
- **Error Handling:**
    - All errors are logged. Users receive friendly, non-sensitive error messages.

## Testing Approach for Contributors

GovnoBot is developed using strict TDD (Test-Driven Development), BDD (Behavior-Driven Development), and ADD (Acceptance-Driven Development) methodologies. All features must be covered by automated tests before implementation.

### How to Contribute Tests

1. **Unit Tests:**
     - Add or update tests in `test/unit/` (e.g., `message-handler.test.js`).
     - Write failing tests for new features or bug fixes before implementing code.
     - Cover all edge cases, error handling, and user scenarios.

2. **BDD/Acceptance Tests:**
     - Use BDD-style descriptions and scenarios for user flows.
     - Ensure all acceptance criteria in PRD.md are covered by tests.

3. **Running Tests:**
     - Use `npm test` or `node test/run-all.js` to run all tests.
     - All tests must pass before submitting a pull request.

4. **Test Coverage:**
     - Strive for 100% coverage of all user interaction paths and error cases.
     - No code should be merged without corresponding tests.

User Stories & Acceptance Criteria could be found in `STORIES.md`