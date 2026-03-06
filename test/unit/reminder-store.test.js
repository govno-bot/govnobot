const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ReminderStore = require('../../src/storage/reminder-store');
const { DATA_DIR } = require('../../src/config');
const { FileLock } = require('../../src/storage/file-lock');

const TEST_REMINDERS_PATH = path.join(DATA_DIR, 'reminders.json');

const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

describe('ReminderStore', () => {
    beforeEach(async () => {
        // Ensure the data directory exists and is clean
        await fs.promises.mkdir(DATA_DIR, { recursive: true });
        if (fs.existsSync(TEST_REMINDERS_PATH)) {
            await fs.promises.unlink(TEST_REMINDERS_PATH);
        }
        const lockFile = FileLock.getLockFilePath(TEST_REMINDERS_PATH);
        if (fs.existsSync(lockFile)) {
            await fs.promises.unlink(lockFile);
        }
    });

    afterEach(async () => {
        if (fs.existsSync(TEST_REMINDERS_PATH)) {
            await fs.promises.unlink(TEST_REMINDERS_PATH);
        }
        const lockFile = FileLock.getLockFilePath(TEST_REMINDERS_PATH);
        if (fs.existsSync(lockFile)) {
            await fs.promises.unlink(lockFile);
        }
    });

    it('should add a reminder', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const reminder = { id: '1', chatId: 123, message: 'Test reminder', remindAt: Date.now() + 1000 };

        await reminderStore.add(reminder);

        const reminders = await reminderStore.getAll();
        assert.strictEqual(reminders.length, 1);
        assert.deepStrictEqual(reminders[0], reminder);
    });

    it('should get all reminders', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const reminder1 = { id: '1', chatId: 123, message: 'Test reminder 1', remindAt: Date.now() + 1000 };
        const reminder2 = { id: '2', chatId: 456, message: 'Test reminder 2', remindAt: Date.now() + 2000 };

        await reminderStore.add(reminder1);
        await reminderStore.add(reminder2);

        const reminders = await reminderStore.getAll();
        assert.strictEqual(reminders.length, 2);
    });

    it('should return an empty array if no reminders file exists', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const reminders = await reminderStore.getAll();
        assert.strictEqual(reminders.length, 0);
    });

    it('should get due reminders', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const now = Date.now();
        const reminder1 = { id: '1', chatId: 123, message: 'Due reminder', remindAt: now - 1000 };
        const reminder2 = { id: '2', chatId: 456, message: 'Future reminder', remindAt: now + 1000 };

        await reminderStore.add(reminder1);
        await reminderStore.add(reminder2);

        const dueReminders = await reminderStore.getDueReminders(now);
        assert.strictEqual(dueReminders.length, 1);
        assert.deepStrictEqual(dueReminders[0], reminder1);
    });

    it('should remove a reminder', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const reminder = { id: '1', chatId: 123, message: 'Test reminder', remindAt: Date.now() + 1000 };

        await reminderStore.add(reminder);
        let reminders = await reminderStore.getAll();
        assert.strictEqual(reminders.length, 1);

        const removed = await reminderStore.remove('1');
        assert.strictEqual(removed, true);

        reminders = await reminderStore.getAll();
        assert.strictEqual(reminders.length, 0);
    });

    it('should return false when trying to remove a non-existent reminder', async () => {
        const reminderStore = new ReminderStore(mockLogger);
        const removed = await reminderStore.remove('non-existent-id');
        assert.strictEqual(removed, false);
    });
});
