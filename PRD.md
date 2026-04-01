# GovnoBot Node.js

## Overview
A production-grade, zero-dependency Telegram AI bot rewritten from PowerShell to Node.js, following strict TDD/BDD/ADD methodology. The project aims for 100% test coverage, cross-platform support, and educational value by using only Node.js built-in modules.

> **⚠️ Important:** Always make edits to `PRD.md` as the *final step* in your workflow. Ensure all implementation and testing are complete before updating this document to reflect the final, verified state of the project.

## Tasks
- [x] Implement HistoryStore archive mechanism. If a user's history file grows to 5MB+, JSON.parse(fs.readFileSync) will block the event loop. So when the history file is almost 5MB you should archive it and create new one.
- [x] UX: Add Telegram Bot Commands Menu (via setMyCommands) so users don't have to type / to see options (in resonable cases)
- [x] DevOps: Create Systemd template for "always-on" persistence.
- [x] Development: Add Image Generation support via your internal "Nano Banana 2" capabilities using the Telegram sendPhoto API.
- [x] DevOps: Make sure system template and everything else is ready for "always-on" persistence on Windows for nodejs version. Provide clear step-by-step instractions on how to setup and test it.
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

## User Stories & Acceptance Criteria (TDD/BDD)

### 1. As a user, I want to start a conversation with the bot so I can receive help and instructions.
**Acceptance Criteria:**
- When I send /start, the bot replies with a welcome message and basic usage instructions.
- If I send /help, the bot lists all available commands and their descriptions.

### 2. As a user, I want to ask questions and receive AI-generated answers.
**Acceptance Criteria:**
- When I send /ask <question>, the bot replies with an AI-generated answer.
- If the answer is too long, it is split into multiple Telegram messages (max 4096 chars each).
- If the AI service is unavailable, the bot responds with a friendly error message.

### 3. As a user, I want to change the AI model used for responses.
**Acceptance Criteria:**
- When I send /model, the bot lists available models and my current selection.
- When I send /model <name>, the bot updates my model and confirms the change.
- If I provide an invalid model, the bot responds with an error and lists valid options.

### 4. As a user, I want to view and manage my conversation history.
**Acceptance Criteria:**
- When I send /history, the bot returns my recent conversation history.
- When I send /history clear, the bot clears my history and confirms.

### 5. As a user, I want to view and update my settings.
**Acceptance Criteria:**
- When I send /settings, the bot displays my current settings (model, system prompt, etc.).
- When I send /settings <key> <value>, the bot updates the setting and confirms.
- If I provide an invalid key or value, the bot responds with an error and lists valid options.

### 6. As a user, I want to know the bot's status and version.
**Acceptance Criteria:**
- When I send /status, the bot replies with uptime, model, and health info.
- When I send /version, the bot replies with the current version.

### 7. As a user, I want to be protected from spam and overuse.
**Acceptance Criteria:**
- If I exceed the per-minute or per-hour rate limit, the bot warns me and blocks further requests until the window resets.

### 8. As an admin, I want to execute shell commands securely.
**Acceptance Criteria:**
- When I send /sh <command> as an admin, the bot executes the command and returns the output.
- Non-admins cannot use /sh and receive an error message.

### 9. As an admin, I want all admin actions to be logged for audit purposes.
**Acceptance Criteria:**
- All admin commands are logged with timestamp, user, and action details in a signed audit log.

### 10. As a user, I want the bot to handle errors gracefully.
**Acceptance Criteria:**
- If an error occurs, the bot logs the error and replies with a user-friendly message.
- No sensitive information is leaked in error messages.
