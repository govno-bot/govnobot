# GovnoBot Node.js – API Documentation

## Overview
GovnoBot is a zero-dependency Telegram AI bot written in Node.js, exposing its functionality via Telegram Bot API commands. All interactions occur through Telegram messages; there is no HTTP/REST API. This document describes the command-based API, expected inputs, outputs, and error handling.

---

## Command API

### Public Commands

- `/start`
  - **Description:** Sends a welcome message and usage instructions.
  - **Input:** None
  - **Output:** Welcome text

- `/help`
  - **Description:** Lists all available commands and their descriptions.
  - **Input:** None
  - **Output:** Command list

 - `/ask <question>`
  - **Description:** Asks the AI a question.
  - **Input:** User question (string)
  - **Output:** AI-generated answer (may be split into multiple messages)
  - **Context Window:** Uses the last N messages (default: 8), summary memory (recent assistant answers), and a pinned system prompt to provide context to the AI for more coherent responses.
  - **Errors:** If AI unavailable, returns a friendly error message.

- `/model [<name>]`
  - **Description:** Shows or sets the current AI model.
  - **Input:** Optional model name
  - **Output:** Current/updated model or error with valid options

- `/history [clear]`
  - **Description:** Shows or clears conversation history.
  - **Input:** Optional 'clear'
  - **Output:** History list or confirmation of clear

- `/settings [<key> <value>]`
  - **Description:** Shows or updates user settings.
  - **Input:** Optional key and value
  - **Output:** Current/updated settings or error with valid options

- `/status`
  - **Description:** Shows bot status (uptime, model, health)
  - **Input:** None
  - **Output:** Status info

- `/version`
  - **Description:** Shows current bot version
  - **Input:** None
  - **Output:** Version string

### Admin Commands

- `/sh <command>`
  - **Description:** Executes a shell command (admin only)
  - **Input:** Shell command string
  - **Output:** Command output or error
  - **Errors:** Non-admins receive error message

- `/agent`
  - **Description:** Placeholder for agent functionality (admin only)
  - **Input:** None
  - **Output:** Placeholder response

---

## Error Handling
- All errors are logged.
- Users receive friendly, non-sensitive error messages.
- Admin actions are logged for audit.

---

## Data Storage API (Internal)
- All user data (history, settings) is stored as JSON files in `data/`.
- Backups are stored in `data/backups/`.
- No external API for data access; all access is internal and file-based.

---

## Extending the API
- To add new commands, implement a handler in `src/commands/public/` or `src/commands/admin/` and add tests in `test/unit/`.
- All new features must be covered by automated tests before merging.
