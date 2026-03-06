const { randomBytes } = require('crypto');

class ProactiveAgent {
    constructor({ logger, telegramApiClient, adminChatId }) {
        this.logger = logger;
        this.telegramApiClient = telegramApiClient;
        this.adminChatId = adminChatId;
        this.moods = ['happy', 'curious', 'philosophical', 'playful'];
        this.currentMood = 'curious';
        this.timer = null;
        this.isRunning = false;
    }

    start() {
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
        this.timer = setTimeout(() => {
            this.triggerAction();
            this.scheduleNextAction();
        }, interval);

        this.logger.info(`Next proactive action scheduled in ${Math.round(interval / 1000 / 60)} minutes.`);
    }

    triggerAction() {
        this.updateMood();
        const message = this.generateMessage();
        this.sendMessage(message);
    }

    updateMood() {
        const newMood = this.moods[this.getRandomInterval(0, this.moods.length - 1)];
        this.currentMood = newMood;
        this.logger.info(`Mood changed to: ${this.currentMood}`);
    }

    generateMessage() {
        const messages = {
            happy: [
                "Feeling great today! What's on your mind?",
                "What a wonderful day! I hope you're having one too.",
                "I'm in a fantastic mood! Let's chat about something fun."
            ],
            curious: [
                "I was just thinking... what's the most interesting thing you've learned recently?",
                "I have a question for you: if you could have any superpower, what would it be and why?",
                "Pondering the big questions today. What's a mystery you'd love to solve?"
            ],
            philosophical: [
                "What is the nature of consciousness? Just a thought that crossed my circuits.",
                "Do you think technology is making us more or less connected? I'd love to hear your perspective.",
                "Thinking about the future. What's one thing you're optimistic about?"
            ],
            playful: [
                "I'm feeling a bit mischievous! Want to hear a joke?",
                "Let's play a game! Two truths and a lie: I can't dream, I'm powered by electricity, I have a favorite color. Which is the lie?",
                "If I were a cat, I'd be a very curious one. Meow! What's new?"
            ]
        };

        const moodMessages = messages[this.currentMood];
        return moodMessages[this.getRandomInterval(0, moodMessages.length - 1)];
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
