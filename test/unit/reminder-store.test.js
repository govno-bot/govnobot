const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ReminderStore = require('../../src/storage/reminder-store');
const { getConfig } = require('../../src/config');
// file-lock module exports helper functions; lock path is filePath + '.lock'
const config = getConfig();
const DATA_DIR = config.data.dir;
const TEST_REMINDERS_PATH = path.join(DATA_DIR, 'reminders.json');

const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

async function cleanTestFiles() {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    if (fs.existsSync(TEST_REMINDERS_PATH)) {
        await fs.promises.unlink(TEST_REMINDERS_PATH);
    }
    const lockFile = `${TEST_REMINDERS_PATH}.lock`;
    if (fs.existsSync(lockFile)) {
        await fs.promises.unlink(lockFile);
    }
}

module.exports.run = async function(runner) {
    await runner.test('should add a reminder', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const reminder = { id: '1', chatId: 123, message: 'Test reminder', remindAt: Date.now() + 1000 };

        await reminderStore.add(reminder);

        const reminders = await reminderStore.getAll();
        runner.assertEqual(reminders.length, 1);
        runner.assertDeepEqual(reminders[0], reminder);
    });

    await runner.test('should get all reminders', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const reminder1 = { id: '1', chatId: 123, message: 'Test reminder 1', remindAt: Date.now() + 1000 };
        const reminder2 = { id: '2', chatId: 456, message: 'Test reminder 2', remindAt: Date.now() + 2000 };

        await reminderStore.add(reminder1);
        await reminderStore.add(reminder2);

        const reminders = await reminderStore.getAll();
        runner.assertEqual(reminders.length, 2);
    });

    await runner.test('should return an empty array if no reminders file exists', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const reminders = await reminderStore.getAll();
        runner.assertEqual(reminders.length, 0);
    });

    await runner.test('should get due reminders', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const now = Date.now();
        const reminder1 = { id: '1', chatId: 123, message: 'Due reminder', remindAt: now - 1000 };
        const reminder2 = { id: '2', chatId: 456, message: 'Future reminder', remindAt: now + 1000 };

        await reminderStore.add(reminder1);
        await reminderStore.add(reminder2);

        const dueReminders = await reminderStore.getDueReminders(now);
        runner.assertEqual(dueReminders.length, 1);
        runner.assertDeepEqual(dueReminders[0], reminder1);
    });

    await runner.test('should remove a reminder', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const reminder = { id: '1', chatId: 123, message: 'Test reminder', remindAt: Date.now() + 1000 };

        await reminderStore.add(reminder);
        let reminders = await reminderStore.getAll();
        runner.assertEqual(reminders.length, 1);

        const removed = await reminderStore.remove('1');
        runner.assertEqual(removed, true);

        reminders = await reminderStore.getAll();
        runner.assertEqual(reminders.length, 0);
    });

    await runner.test('should return false when trying to remove a non-existent reminder', async () => {
        await cleanTestFiles();

        const reminderStore = new ReminderStore(mockLogger);
        const removed = await reminderStore.remove('non-existent-id');
        runner.assertEqual(removed, false);
    });
};
