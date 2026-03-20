const assert = require('assert');
const sinon = require('sinon');
const ReminderScheduler = require('../../src/reminder-scheduler');

const mockLogger = {
    info: sinon.spy(),
    warn: sinon.spy(),
    error: sinon.spy(),
    debug: sinon.spy(),
};

module.exports.run = async function(runner) {
    await runner.test('should start and stop the scheduler', async () => {
        const clock = sinon.useFakeTimers();
        const reminderStore = { getDueReminders: sinon.stub(), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        scheduler.start(1000);
        runner.assert(!!scheduler.intervalId, 'Scheduler should have intervalId set');
        scheduler.stop();
        runner.assertEqual(scheduler.intervalId, null, 'Scheduler intervalId should be null after stop');

        clock.restore();
        sinon.restore();
    });

    await runner.test('should not start if already running', async () => {
        const clock = sinon.useFakeTimers();
        const reminderStore = { getDueReminders: sinon.stub(), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        scheduler.start(1000);
        scheduler.start(1000);
        runner.assert(mockLogger.warn.calledWith('ReminderScheduler is already running.'), 'Should warn when starting while already running');

        scheduler.stop();
        clock.restore();
        sinon.restore();
    });

    await runner.test('should not stop if not running', async () => {
        const reminderStore = { getDueReminders: sinon.stub(), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        scheduler.stop();
        runner.assert(mockLogger.warn.calledWith('ReminderScheduler is not running.'), 'Should warn when stopping while not running');

        sinon.restore();
    });

    await runner.test('should check for and send due reminders', async () => {
        const reminderStore = { getDueReminders: sinon.stub(), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub().resolves() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        const now = Date.now();
        const dueReminders = [
            { id: '1', chatId: 123, message: 'Test 1', remindAt: now - 100 },
            { id: '2', chatId: 456, message: 'Test 2', remindAt: now - 50 },
        ];
        reminderStore.getDueReminders.resolves(dueReminders);
        reminderStore.remove.resolves(true);

        await scheduler.checkAndSendReminders();

        runner.assert(reminderStore.getDueReminders.calledOnce, 'Should check due reminders');
        runner.assertEqual(telegramApiClient.sendMessage.callCount, 2);
        runner.assert(telegramApiClient.sendMessage.calledWith(123, '🔔 Reminder: Test 1'));
        runner.assert(telegramApiClient.sendMessage.calledWith(456, '🔔 Reminder: Test 2'));
        runner.assertEqual(reminderStore.remove.callCount, 2);
        runner.assert(reminderStore.remove.calledWith('1'));
        runner.assert(reminderStore.remove.calledWith('2'));

        sinon.restore();
    });

    await runner.test('should handle errors when sending a reminder', async () => {
        const reminderStore = { getDueReminders: sinon.stub(), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub().rejects(new Error('Send failed')) };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        const now = Date.now();
        const dueReminders = [{ id: '1', chatId: 123, message: 'Test 1', remindAt: now - 100 }];
        reminderStore.getDueReminders.resolves(dueReminders);

        await scheduler.checkAndSendReminders();

        runner.assert(reminderStore.getDueReminders.calledOnce);
        runner.assert(telegramApiClient.sendMessage.calledOnce);
        runner.assert(mockLogger.error.called, 'Should log error when reminder send fails');
        runner.assert(reminderStore.remove.notCalled);

        sinon.restore();
    });

    await runner.test('should handle errors when checking for reminders', async () => {
        const reminderStore = { getDueReminders: sinon.stub().rejects(new Error('Store failed')), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        await scheduler.checkAndSendReminders();

        runner.assert(mockLogger.error.called, 'Should log error when checking for due reminders fails');
        runner.assert(telegramApiClient.sendMessage.notCalled);
        runner.assert(reminderStore.remove.notCalled);

        sinon.restore();
    });

    await runner.test('should run periodically', async () => {
        const clock = sinon.useFakeTimers();
        const reminderStore = { getDueReminders: sinon.stub().resolves([]), remove: sinon.stub() };
        const telegramApiClient = { sendMessage: sinon.stub() };
        const scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);

        const checkAndSendRemindersSpy = sinon.spy(scheduler, 'checkAndSendReminders');

        scheduler.start(1000); // Check every second

        await clock.tickAsync(1000);
        runner.assert(checkAndSendRemindersSpy.calledOnce);

        await clock.tickAsync(1000);
        runner.assert(checkAndSendRemindersSpy.calledTwice);

        scheduler.stop();
        clock.restore();
        sinon.restore();
    });
};
