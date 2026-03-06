const path = require('path');
const fs = require('fs');
const { withFileLock } = require('./file-lock');
const Config = require('../config');
const config = new Config();
const DATA_DIR = config.dataDir;

const REMINDERS_PATH = path.join(DATA_DIR, 'reminders.json');

class ReminderStore {
    constructor(logger) {
        this.logger = logger;
    }

    async add(reminder) {
        return withFileLock(REMINDERS_PATH, async () => {
            const reminders = await this.getAll();
            reminders.push(reminder);
            await fs.promises.writeFile(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
            this.logger.info(`Reminder added for user ${reminder.chatId} at ${new Date(reminder.remindAt).toISOString()}`);
            return reminder;
        });
    }

    async getAll() {
        return withFileLock(REMINDERS_PATH, async () => {
            try {
                const data = await fs.promises.readFile(REMINDERS_PATH, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return [];
                }
                throw error;
            }
        });
    }

    async getDueReminders(now) {
        return withFileLock(REMINDERS_PATH, async () => {
            const reminders = await this.getAll();
            return reminders.filter(r => r.remindAt <= now);
        });
    }

    async remove(reminderId) {
        return withFileLock(REMINDERS_PATH, async () => {
            let reminders = await this.getAll();
            const initialLength = reminders.length;
            reminders = reminders.filter(r => r.id !== reminderId);
            if (reminders.length < initialLength) {
                await fs.promises.writeFile(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
                this.logger.info(`Reminder ${reminderId} removed.`);
                return true;
            }
            return false;
        });
    }
}

module.exports = ReminderStore;
