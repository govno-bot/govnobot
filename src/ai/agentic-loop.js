const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto'); // Need crypto for reminder IDs

class AgenticLoop {
    constructor({ logger, telegramApiClient, adminChatId, fallbackChain, historyStore, notepadStore, reminderStore }) {
        this.logger = logger;
        this.telegramApiClient = telegramApiClient;
        this.adminChatId = adminChatId;
        this.fallbackChain = fallbackChain;
        this.historyStore = historyStore;
        this.notepadStore = notepadStore;
        this.reminderStore = reminderStore;

        // Optional profiling settings
        // When enabled, AgenticLoop logs periodic memory/cpu usage for long-running runs.
        this.profilingEnabled = false;
        this.lastCpuUsage = process.cpuUsage();

        this.timer = null;
        this.isRunning = false;
    }

    enableProfiling() {
        this.profilingEnabled = true;
        this.lastCpuUsage = process.cpuUsage();
    }

    captureProfilingStats() {
        const memoryUsage = process.memoryUsage();
        const cpuUsageDelta = process.cpuUsage(this.lastCpuUsage);
        this.lastCpuUsage = process.cpuUsage();

        return {
            timestamp: new Date().toISOString(),
            memoryUsage,
            cpuUsageDelta
        };
    }

    start() {
        if (this.isRunning) {
            if (this.logger) this.logger.warn('AgenticLoop is already running.');
            return;
        }
        this.isRunning = true;
        if (this.logger) this.logger.info('AgenticLoop started.');
        if (this.profilingEnabled && this.logger) {
            this.logger.info('AgenticLoop profiling enabled. Memory/CPU stats will be logged each iteration.');
        }
        this.scheduleNextIteration(10000); // 10 seconds for the first run
    }

    stop() {
        if (!this.isRunning) {
            if (this.logger) this.logger.warn('AgenticLoop is not running.');
            return;
        }
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.logger) this.logger.info('AgenticLoop stopped.');
    }

    scheduleNextIteration(delayMs = null) {
        if (!this.isRunning) return;

        // Default interval 30 to 120 mins
        const interval = delayMs || (Math.floor(Math.random() * (120 * 60 * 1000 - 30 * 60 * 1000 + 1)) + 30 * 60 * 1000);
        
        this.timer = setTimeout(async () => {
            await this.executeIteration();
            this.scheduleNextIteration();
        }, interval);

        if (this.logger) this.logger.debug(`Next AgenticLoop iteration scheduled in ${Math.round(interval / 1000 / 60)} minutes.`);
    }

    async getSystemContext() {
        return {
            platform: os.platform(),
            uptime: Math.floor(process.uptime()),
            memoryUsage: process.memoryUsage(),
            date: new Date().toISOString()
        };
    }

    async executeIteration() {
        if (this.logger) this.logger.info('AgenticLoop: Executing evaluation iteration.');

        if (this.profilingEnabled && this.logger) {
            const stats = this.captureProfilingStats();
            this.logger.debug(`AgenticLoop profiling: rss=${Math.round(stats.memoryUsage.rss / 1024 / 1024)}MB heapUsed=${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB cpuUser=${Math.round(stats.cpuUsageDelta.user / 1000)}ms cpuSystem=${Math.round(stats.cpuUsageDelta.system / 1000)}ms`);
        }
        
        let notepad = { goals: [], thoughts: "", planned_actions: [] };
        if (this.notepadStore) {
            notepad = await this.notepadStore.load();
        }
        
        const systemContext = await this.getSystemContext();

        const prompt = `You are an advanced, autonomous AI agent inside a Telegram Bot.
You run a continuous evaluation loop where you formulate goals, check constraints, and can query the environment or users.
Current system context: ${JSON.stringify(systemContext)}
Your current internal notepad: ${JSON.stringify(notepad)}

Self-Reflection & Task Breakdown:
If you are given an ambiguous goal, you must use your notepad to break down the task into smaller sub-tasks.
You can schedule execution of your tasks via the reminder/scheduler subsystem by specifying "schedule_reminder".
You should follow up on these tasks proactively.

Based on your current goals and status, decide on your next thoughts and actions.
You may optionally send a message to the admin (e.g. asking for permissions, querying state, or making suggestions).
You may update your goals and planned actions.
If you need to revisit an action later, you can schedule a reminder by providing a message and a relative delay in minutes.

Respond strictly in JSON format matching this schema:
{
  "thoughts": "Your internal reasoning...",
  "goals": ["Goal 1", "Goal 2"],
  "planned_actions": ["Action 1", "Action 2"],
  "query_environment": true | false,
  "message_to_admin": "Message to send, or null if nothing",
  "schedule_reminder": { "delay_minutes": number, "message": "Reminder message" } | null
}`;

        try {
            if (this.fallbackChain) {
                const response = await this.fallbackChain.call([{ role: 'system', content: prompt }], { timeout: 45000 });
                const jsonMatch = response.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    if (this.notepadStore) {
                        await this.notepadStore.update({
                            thoughts: parsed.thoughts || "",
                            goals: parsed.goals || [],
                            planned_actions: parsed.planned_actions || []
                        });
                    }

                    if (this.logger) this.logger.info('AgenticLoop computed new state.');
                    
                    if (parsed.schedule_reminder && this.reminderStore && this.adminChatId) {
                        const remindAt = Date.now() + (parsed.schedule_reminder.delay_minutes * 60 * 1000);
                        const reminder = {
                            id: crypto.randomBytes(8).toString('hex'),
                            chatId: this.adminChatId,
                            message: "Agent Task Reminder: " + parsed.schedule_reminder.message,
                            remindAt: remindAt
                        };
                        await this.reminderStore.add(reminder);
                        if (this.logger) this.logger.info(`AgenticLoop scheduled a reminder for ${parsed.schedule_reminder.delay_minutes} mins.`);
                    }

                    if (parsed.message_to_admin && this.adminChatId) {
                        await this.telegramApiClient.sendMessage(this.adminChatId, `*Agentic Loop Update:*\n${parsed.message_to_admin}`);
                        if (this.logger) this.logger.info('AgenticLoop sent message to admin.');
                    }
                    
                    if (parsed.query_environment) {
                        if (this.logger) this.logger.info('AgenticLoop requested environment query.');
                    }
                }
            }
        } catch (err) {
            if (this.logger) this.logger.error('AgenticLoop evaluation failed:', err);
        }
    }
}

module.exports = AgenticLoop;

module.exports = AgenticLoop;
