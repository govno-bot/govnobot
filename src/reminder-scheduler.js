
const RecoveryManager = require('./utils/recovery-manager');

class ReminderScheduler {
    constructor(reminderStore, telegramApiClient, logger, adminNotifier = null) {
        this.reminderStore = reminderStore;
        this.telegramApiClient = telegramApiClient;
        this.logger = logger;
        this.intervalId = null;
        this.recovery = new RecoveryManager({
            logger,
            adminNotifier,
            maxRetries: 3,
            backoffBaseMs: 60000
        });
    }

    start(interval = 60000) { // Check every minute
        if (this.intervalId) {
            this.logger.warn('ReminderScheduler is already running.');
            return;
        }
        this.logger.info('Starting ReminderScheduler...');
        this.intervalId = setInterval(() => this.checkAndSendReminders(), interval);
    }

    stop() {
        if (!this.intervalId) {
            this.logger.warn('ReminderScheduler is not running.');
            return;
        }
        this.logger.info('Stopping ReminderScheduler...');
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    async checkAndSendReminders() {
        this.logger.debug('Checking for due reminders...');
        try {
            const now = Date.now();
            const dueReminders = await this.reminderStore.getDueReminders(now);

            for (const reminder of dueReminders) {
                if (!this.recovery.shouldRetry(reminder.id)) {
                    this.logger.warn(`Reminder ${reminder.id} exceeded max retries, skipping.`);
                    continue;
                }
                try {
                    await this.telegramApiClient.sendMessage(reminder.chatId, `🔔 Reminder: ${reminder.message}`);
                    await this.reminderStore.remove(reminder.id);
                    this.logger.info(`Sent reminder ${reminder.id} to chat ${reminder.chatId}`);
                    this.recovery.recordSuccess(reminder.id);
                } catch (error) {
                    this.logger.error(`Failed to send reminder ${reminder.id} or remove it:`, error);
                    this.recovery.recordFailure(reminder.id, error);
                }
            }
        } catch (error) {
            this.logger.error('Error checking for due reminders:', error);
        }
    }
}

module.exports = ReminderScheduler;
