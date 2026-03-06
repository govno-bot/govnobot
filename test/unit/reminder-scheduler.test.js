const assert = require('assert');
const sinon = require('sinon');
const ReminderScheduler = require('../../src/reminder-scheduler');

const mockLogger = {
    info: sinon.spy(),
    warn: sinon.spy(),
    error: sinon.spy(),
    debug: sinon.spy(),
};

describe('ReminderScheduler', () => {
    let reminderStore;
    let telegramApiClient;
    let scheduler;
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        reminderStore = {
            getDueReminders: sinon.stub(),
            remove: sinon.stub(),
        };
        telegramApiClient = {
            sendMessage: sinon.stub(),
        };
        scheduler = new ReminderScheduler(reminderStore, telegramApiClient, mockLogger);
    });

    afterEach(() => {
        scheduler.stop();
        sinon.restore();
        clock.restore();
    });

    it('should start and stop the scheduler', () => {
        scheduler.start(1000);
        assert.ok(scheduler.intervalId);
        scheduler.stop();
        assert.strictEqual(scheduler.intervalId, null);
    });

    it('should not start if already running', () => {
        scheduler.start(1000);
        scheduler.start(1000);
        assert(mockLogger.warn.calledWith('ReminderScheduler is already running.'));
    });

    it('should not stop if not running', () => {
        scheduler.stop();
        assert(mockLogger.warn.calledWith('ReminderScheduler is not running.'));
    });

    it('should check for and send due reminders', async () => {
        const now = Date.now();
        const dueReminders = [
            { id: '1', chatId: 123, message: 'Test 1', remindAt: now - 100 },
            { id: '2', chatId: 456, message: 'Test 2', remindAt: now - 50 },
        ];
        reminderStore.getDueReminders.resolves(dueReminders);
        telegramApiClient.sendMessage.resolves();
        reminderStore.remove.resolves(true);

        await scheduler.checkAndSendReminders();

        assert(reminderStore.getDueReminders.calledOnce);
        assert.strictEqual(telegramApiClient.sendMessage.callCount, 2);
        assert(telegramApiClient.sendMessage.calledWith(123, '🔔 Reminder: Test 1'));
        assert(telegramApiClient.sendMessage.calledWith(456, '🔔 Reminder: Test 2'));
        assert.strictEqual(reminderStore.remove.callCount, 2);
        assert(reminderStore.remove.calledWith('1'));
        assert(reminderStore.remove.calledWith('2'));
    });

    it('should handle errors when sending a reminder', async () => {
        const now = Date.now();
        const dueReminders = [{ id: '1', chatId: 123, message: 'Test 1', remindAt: now - 100 }];
        reminderStore.getDueReminders.resolves(dueReminders);
        telegramApiClient.sendMessage.rejects(new Error('Send failed'));

        await scheduler.checkAndSendReminders();

        assert(reminderStore.getDueReminders.calledOnce);
        assert(telegramApiClient.sendMessage.calledOnce);
        assert(mockLogger.error.calledWith('Failed to send reminder 1 or remove it:', sinon.match.instanceOf(Error)));
        assert(reminderStore.remove.notCalled);
    });

    it('should handle errors when checking for reminders', async () => {
        reminderStore.getDueReminders.rejects(new Error('Store failed'));

        await scheduler.checkAndSendReminders();

        assert(mockLogger.error.calledWith('Error checking for due reminders:', sinon.match.instanceOf(Error)));
        assert(telegramApiClient.sendMessage.notCalled);
        assert(reminderStore.remove.notCalled);
    });

    it('should run periodically', async () => {
        const checkAndSendRemindersSpy = sinon.spy(scheduler, 'checkAndSendReminders');
        
        scheduler.start(1000); // Check every second

        await clock.tickAsync(1000);
        assert(checkAndSendRemindersSpy.calledOnce);

        await clock.tickAsync(1000);
        assert(checkAndSendRemindersSpy.calledTwice);
        
        scheduler.stop();
    });
});
