
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
