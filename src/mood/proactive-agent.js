const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

class ProactiveAgent {
    constructor({ logger, telegramApiClient, adminChatId, fallbackChain, historyStore, notepadStore }) {
        this.logger = logger;
        this.telegramApiClient = telegramApiClient;
        this.adminChatId = adminChatId;
        this.fallbackChain = fallbackChain;
        this.historyStore = historyStore;
        this.notepadStore = notepadStore;
        this.moods = ['happy', 'curious', 'philosophical', 'playful'];
        this.currentMood = 'curious';
        this.timer = null;
        this.isRunning = false;
    }    start() {
        if (this.isRunning) {
            this.logger.warn('ProactiveAgent is already running.');
            return;
        }
        this.isRunning = true;
        this.scheduleNextAction();
        this.logger.info('ProactiveAgent started.');
    }

    stop() {
        if (!this.isRunning) {
            this.logger.warn('ProactiveAgent is not running.');
            return;
        }
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.logger.info('ProactiveAgent stopped.');
    }

    scheduleNextAction() {
        if (!this.isRunning) return;

        const interval = this.getRandomInterval(1 * 60 * 60 * 1000, 3 * 60 * 60 * 1000); // 1 to 3 hours
        this.timer = setTimeout(async () => {
            await this.triggerAction();
            this.scheduleNextAction();
        }, interval);

        this.logger.info(`Next proactive action scheduled in ${Math.round(interval / 1000 / 60)} minutes.`);
    }

    async triggerAction() {
        this.updateMood();
        const message = await this.generateMessage();
        if (message) {
            await this.sendMessage(message);
        }
    }

    updateMood() {
        const newMood = this.moods[this.getRandomInterval(0, this.moods.length - 1)];
        this.currentMood = newMood;
        this.logger.info(`Mood changed to: ${this.currentMood}`);
    }

    async generateMessage() {
        let scratchpad = { notes: "" };
        if (this.notepadStore) {
            scratchpad = await this.notepadStore.load();
        }

        const prompt = `You are a proactive bot with current mood: ${this.currentMood}.
Here is your current internal scratchpad/todo list:
${JSON.stringify(scratchpad)}Think about your current goals and decide if you want to update your notepad or send a message to the user.
Please respond strictly in JSON format with the following keys:
- "notepad": (string) Your updated notes, thoughts, and planned actions.
- "message": (string|null) The message you want to proactively send to the admin/user. Leave as null if you don't want to talk right now.`;

        try {
            if (this.fallbackChain) {
                const response = await this.fallbackChain.call([{ role: 'system', content: prompt }], { timeout: 30000 });
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.notepad && this.notepadStore) {
                        await this.notepadStore.update({ notes: parsed.notepad });
                        this.logger.info('ProactiveAgent updated scratchpad.');
                    }
                    if (parsed.message) {
                        return parsed.message;
                    }
                }
            }
        } catch (err) {
            this.logger.error('Failed to generate proactive AI message:', err);
        }

        // Fallback to static if AI fails or doesn't want to reply
        return null; // Don't spam if AI fails
    }

    async sendMessage(message) {
        try {
            if (!this.adminChatId) {
                this.logger.warn('No admin chat ID configured. Cannot send proactive message.');
                return;
            }
            await this.telegramApiClient.sendMessage(this.adminChatId, `*Proactive Message (${this.currentMood}):*\n\n${message}`);
            this.logger.info(`Sent proactive message to admin chat: ${message}`);
        } catch (error) {
            this.logger.error('Failed to send proactive message:', error);
        }
    }

    getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = ProactiveAgent;

module.exports = ProactiveAgent;
