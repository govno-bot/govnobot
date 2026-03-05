# GovnoBot Node.js – Test Strategy

## Overview
GovnoBot is developed using strict TDD (Test-Driven Development), BDD (Behavior-Driven Development), and ADD (Acceptance-Driven Development) methodologies. This ensures all features are covered by automated tests before implementation, with a goal of 100% test coverage.

---

## Test Types

### 1. Unit Tests
- Location: `test/unit/`
- Purpose: Test individual modules (utils, storage, security, AI, etc.) in isolation.
- Approach: Write failing tests before code. Cover all edge cases and error handling.
- Example: `test/unit/logger.test.js`, `test/unit/file-lock.test.js`

### 2. Integration & E2E Tests
- Location: `test/acceptance/`, `test/features/`
- Purpose: Test combinations of modules and full user/admin flows.
- Approach: Simulate real Telegram interactions, including command routing, AI fallback, and error cases.
- Example: `test/acceptance/integration-e2e.test.js`

### 3. Acceptance/BDD Tests
- Location: `test/features/`
- Purpose: Describe user stories and acceptance criteria as executable specs.
- Approach: Use BDD-style scenarios for all user and admin flows.

---

## Test Execution
- All tests are run using the custom runner: `node test/run-all.js` (no external dependencies).
- Tests are automatically discovered and executed.
- All tests must pass before merging or deployment.

---

## Coverage
- 100% coverage of all user interaction paths and error cases is required.
- No code is merged without corresponding tests.

---

## Contributor Guidelines
- Add or update tests for all new features and bug fixes.
- Write tests before code (TDD-first).
- Update documentation if new user flows or testing practices are introduced.
