class ReminderScheduler {
    constructor(reminderStore, telegramApiClient, logger) {
        this.reminderStore = reminderStore;
        this.telegramApiClient = telegramApiClient;
        this.logger = logger;
        this.intervalId = null;
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
                try {
                    await this.telegramApiClient.sendMessage(reminder.chatId, `🔔 Reminder: ${reminder.message}`);
                    await this.reminderStore.remove(reminder.id);
                    this.logger.info(`Sent reminder ${reminder.id} to chat ${reminder.chatId}`);
                } catch (error) {
                    this.logger.error(`Failed to send reminder ${reminder.id} or remove it:`, error);
                    // Decide on a retry strategy or if the reminder should be kept or removed.
                    // For now, we'll leave it and it will be picked up again.
                }
            }
        } catch (error) {
            this.logger.error('Error checking for due reminders:', error);
        }
    }
}

module.exports = ReminderScheduler;
