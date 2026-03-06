const assert = require('assert');
const sinon = require('sinon');
const { handler: handleRemind } = require('../../src/commands/public/command-remind');

const mockLogger = {
    info: sinon.spy(),
    error: sinon.spy(),
};

describe('Command: /remind', () => {
    let reminderStore;
    let telegramApiClient;
    let message;

    beforeEach(() => {
        reminderStore = {
            add: sinon.stub().resolves(),
        };
        telegramApiClient = {
            sendMessage: sinon.stub().resolves(),
        };
        message = {
            chat: { id: 123 },
        };
        mockLogger.info.resetHistory();
        mockLogger.error.resetHistory();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should show usage if args are insufficient', async () => {
        await handleRemind(message, [], { telegramApiClient });
        assert(telegramApiClient.sendMessage.calledWith(123, 'Usage: /remind <time> <message>\nExample: /remind 10m Check on the cat'));
    });

    it('should reject invalid time format', async () => {
        await handleRemind(message, ['10x', 'test'], { telegramApiClient });
        assert(telegramApiClient.sendMessage.calledWith(123, 'Invalid time format. Use s, m, h, d (e.g., 30s, 10m, 2h, 1d).'));
    });

    it('should set a reminder successfully', async () => {
        const clock = sinon.useFakeTimers();
        const now = Date.now();
        
        await handleRemind(message, ['10m', 'Check the oven'], { reminderStore, telegramApiClient, logger: mockLogger });

        assert(reminderStore.add.calledOnce);
        const reminder = reminderStore.add.getCall(0).args[0];
        assert.strictEqual(reminder.chatId, 123);
        assert.strictEqual(reminder.message, 'Check the oven');
        assert.ok(reminder.remindAt > now + 9 * 60 * 1000);

        assert(telegramApiClient.sendMessage.calledOnce);
        const sentMessage = telegramApiClient.sendMessage.getCall(0).args[1];
        assert.ok(sentMessage.startsWith('✅ Reminder set for'));

        assert(mockLogger.info.calledOnce);

        clock.restore();
    });

    it('should handle errors when setting a reminder', async () => {
        reminderStore.add.rejects(new Error('Store failed'));
        await handleRemind(message, ['5s', 'a quick one'], { reminderStore, telegramApiClient, logger: mockLogger });

        assert(reminderStore.add.calledOnce);
        assert(telegramApiClient.sendMessage.calledWith(123, '❌ Could not set reminder. Please try again later.'));
        assert(mockLogger.error.calledOnce);
    });
});
