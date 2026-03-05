# 🚀 GovnoBot: A Roadmap to Slightly Less Inevitable Doom 🚀

**Last Updated:** 2026-03-05

This document outlines the path forward for GovnoBot. The core is stable, but the future is a minefield of complexity, user abuse, and technical debt. This roadmap acknowledges the crushing reality of software development and attempts to navigate it with a healthy dose of paranoid pessimism.

---

## 🏆 The Hall of Legends (Previously Conquered) 🏆

A brief, futile acknowledgment of past efforts. A stable foundation built on TDD and zero dependencies.

- **Core Infrastructure:** Test suite, utilities, and persistent storage are complete.
- **AI & API Integration:** Telegram API mastered; multiple AI providers integrated.
- **Command & Docs:** A full suite of commands and comprehensive documentation exist.

**Test Status:** 27 files, 200+ assertions. ✅ All Passing. A brief respite before the chaos.

---

## ⚠️ The Abyss: Risks & Realities ⚠️

A section dedicated to everything that will, and probably already has, started to go wrong.

-   **Technical Risks:**
    -   **Telegram API Limits:** Rate limiting on message edits, image uploads, and API calls will complicate features like streaming.
    -   **State Management:** Stateful features (games, reminders) add significant complexity around persistence and restart safety.
    -   **"Zero Dependency" Dogma:** Sticking to this principle for features like image/audio processing will lead to re-implementing large parts of npm, a truly Sisyphean task.
-   **Operational Concerns:**
    -   **Scalability:** A single-instance, polling-based architecture will not scale.
    -   **Monitoring:** Lack of a health check endpoint and error telemetry means we are flying blind.
    -   **Moderation:** Without robust anti-spam, rate limiting, and user banning, the bot will be quickly overwhelmed by abuse.
-   **AI Cost & Performance:**
    -   **Context Windows:** Unmanaged context will lead to exponential increases in token usage and cost.
    -   **Latency:** Features like image generation and voice transcription introduce significant, user-facing delays that require queuing and feedback systems.

---

## 💎 The Treasure Chest: A Prioritized Plan for Future Suffering 💎

A revised feature list, re-prioritized based on a grim acceptance of user needs and technical feasibility.

### ⭐ Tier 1: The Foundational Pillars ⭐

*Critical features required for a robust and usable bot. These are not optional.*

-   [ ] **Advanced Moderation & Safety:**
    -   **Description:** Implement a full suite of moderation tools: granular command cooldowns (per-user, per-chat, per-command), prompt filtering, user ban lists, and anti-spam measures.
    -   **Justification:** A bot without moderation is a magnet for chaos. This is a prerequisite for public use.
-   [ ] **AI Streaming & Response Handling:**
    -   **Description:** Show AI responses as they generate.
    -   **Implementation Plan:** Investigate and choose a strategy: progressive message edits (with rate limit awareness), chunk buffering, or a simple "typing" indicator (e.g., `▌`).
-   [ ] **Scheduled Messages & Reminders:**
    -   **Description:** Implement a `/remind <time> <message>` command.
    -   **Technical Needs:** Requires a persistent, restart-safe background scheduler and robust timezone handling.
-   [ ] **Smarter Conversation Context:**
    -   **Description:** Implement a configurable context window strategy.
    -   **Implementation Plan:** Start with a simple "last N messages" approach, with plans for summary memory and pinned system context.
-   [ ] **Health Check & Error Telemetry:**
    -   **Description:** Add a production-ready `/health` endpoint and commands for viewing logs (`/logs`) and error reports.
    -   **Justification:** A bot that cannot report its own status is already dead.

### 🎲 Tier 2: High-Impact Engagement 🎲

*Features that dramatically increase the bot's utility and "fun," whatever that is.*

-   [ ] **Proactive Agent Mode:**
    -   **Description:** Allow the bot to initiate conversations with users based on triggers, events, or an internal "mood."
    -   **Justification:** Transforms the bot from a reactive tool into a proactive companion, creating a more dynamic and engaging experience.
    -   **Technical Needs:** Requires a sophisticated trigger mechanism (event-driven or scheduled), contextual awareness (user history, external data), robust user controls to disable/configure the feature, and state management to avoid spamming.
-   [ ] **Conversation Personalities:**
    -   **Description:** Allow users to set the bot's personality (e.g., `/persona pirate`, `/persona therapist`).
    -   **Justification:** High replay value for low implementation cost compared to complex games.
-   [ ] **Image Generation (with proper architecture):**
    -   **Description:** `/imagine <prompt>` command.
    -   **Technical Needs:** Requires a job queue system, progress feedback to the user, timeout handling, and a strategy for GPU requirements (or offloading to an API). Acknowledge that this may require an external dependency.
-   [ ] **Voice Message Transcription:**
    -   **Description:** Transcribe user voice messages and feed them to the AI.
    -   **Technical Needs:** Requires a processing pipeline: download OGG/OPUS file -> convert -> transcribe (e.g., via Whisper API) -> respond.
-   [ ] **Inline AI Queries:**
    -   **Description:** Allow the bot to respond when mentioned directly in a chat without a command prefix.
    -   **Technical Needs:** Requires robust mention detection, context extraction, and spam filtering to prevent it from replying to everything.

### 🛠️ Tier 3: The Long, Dark Road to Polish 🛠️

*Good ideas that can wait until the foundational fires are put out.*

-   [ ] **Plugin/Addon Architecture:**
    -   **Description:** Refactor features like games and meme generators into a modular plugin system.
    -   **Justification:** The only sane path to long-term growth and external contributions. A legendary bot is a platform.
-   [ ] **Game Master Mode (Phased Approach):**
    -   **Phase 1:** Stateless, improv storytelling (`/gm <scenario>`).
    -   **Phase 2:** A stateful campaign system with persistence.
-   [ ] **Generic Game Framework:**
    -   **Description:** Instead of a one-off `/ttt` command, build a framework for turn-based games (`/game start ttt`, `/game move c2`).
-   [ ] **Capability-Based Model Aliases:**
    -   **Description:** Create aliases that describe model capabilities (e.g., `/model fast`, `/model smart`) instead of just names.
-   [ ] **Admin Analytics Dashboard:**
    -   **Description:** A simple `/stats <period>` command based on structured log aggregation.

---

## 📜 The Developer's Creed (Revised) 📜

1.  **TDD is Law:** The only shield against the darkness.
2.  **No *Unnecessary* Bloat:** Stick to the standard library, but do not reimplement `ffmpeg` in pure JavaScript. Acknowledge when a dependency is the lesser of two evils.
3.  **Commit Small, Win Small:** Each commit is a tiny victory against the encroaching entropy.
4.  **Document the Misery:** So that others may learn from our suffering.

*The bot is functional. The future is an exercise in managing complexity and staving off obsolescence.*
