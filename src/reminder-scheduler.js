
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
<<<<<<< HEAD
                    this.logger.error(`Failed to send reminder ${reminder.id} or remove it:`, error);
                    this.recovery.recordFailure(reminder.id, error);
=======
                    this.logger.error(`ChatId: ${reminder.chatId} - Failed to send reminder ${reminder.id} or remove it:`, error);
                    // Decide on a retry strategy or if the reminder should be kept or removed.
                    // For now, we'll leave it and it will be picked up again.
>>>>>>> 069fad8534b0c8182f6c294422e1eba3cbbe2cc7
                }
            }
        } catch (error) {
            this.logger.error('Error checking for due reminders:', error);
        }
    }
}

module.exports = ReminderScheduler;
