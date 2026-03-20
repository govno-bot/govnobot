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
    // Internal helper that reads reminders without acquiring a lock.
    // Use this only when the caller already holds the lock.
    async _readRemindersNoLock() {
        try {
            const data = await fs.promises.readFile(REMINDERS_PATH, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async add(reminder) {
        return withFileLock(REMINDERS_PATH, async () => {
            const reminders = await this._readRemindersNoLock();
            reminders.push(reminder);
            await fs.promises.writeFile(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
            if (this.logger) this.logger.info(`Reminder added for user ${reminder.chatId} at ${new Date(reminder.remindAt).toISOString()}`);
            return reminder;
        });
    }

    // Public read with locking for callers that simply want all reminders.
    async getAll() {
        return withFileLock(REMINDERS_PATH, async () => {
            return await this._readRemindersNoLock();
        });
    }

    async getDueReminders(now) {
        return withFileLock(REMINDERS_PATH, async () => {
            const reminders = await this._readRemindersNoLock();
            return reminders.filter(r => r.remindAt <= now);
        });
    }

    async remove(reminderId) {
        return withFileLock(REMINDERS_PATH, async () => {
            let reminders = await this._readRemindersNoLock();
            const initialLength = reminders.length;
            reminders = reminders.filter(r => r.id !== reminderId);
            if (reminders.length < initialLength) {
                await fs.promises.writeFile(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
                if (this.logger) this.logger.info(`Reminder ${reminderId} removed.`);
                return true;
            }
            return false;
        });
    }
}

module.exports = ReminderStore;
