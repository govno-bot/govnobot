const assert = require('assert');
const sinon = require('sinon');
const { handler: handleRemind } = require('../../src/commands/public/command-remind');

const mockLogger = {
    info: sinon.spy(),
    error: sinon.spy(),
};

module.exports.run = async function(runner) {
    await runner.test('should show usage if args are insufficient', async () => {
        const reminderStore = { add: sinon.stub().resolves() };
        const telegramApiClient = { sendMessage: sinon.stub().resolves() };
        const message = { chat: { id: 123 } };

        await handleRemind({ chatId: message.chat.id, args: [], telegramApiClient });
        runner.assert(
            telegramApiClient.sendMessage.calledWith(123, 'Usage: /remind <time> <message>\nExample: /remind 10m Check on the cat'),
            'Should send usage message when no args provided'
        );
    });

    await runner.test('should reject invalid time format', async () => {
        const reminderStore = { add: sinon.stub().resolves() };
        const telegramApiClient = { sendMessage: sinon.stub().resolves() };
        const message = { chat: { id: 123 } };

        await handleRemind({ chatId: message.chat.id, args: ['10x', 'test'], telegramApiClient });
        runner.assert(
            telegramApiClient.sendMessage.calledWith(123, 'Invalid time format. Use s, m, h, d (e.g., 30s, 10m, 2h, 1d).'),
            'Should reject invalid time formats'
        );
    });

    await runner.test('should set a reminder successfully', async () => {
        const clock = sinon.useFakeTimers();
        const now = Date.now();
        const reminderStore = { add: sinon.stub().resolves() };
        const telegramApiClient = { sendMessage: sinon.stub().resolves() };
        const message = { chat: { id: 123 } };

        mockLogger.info.resetHistory();
        mockLogger.error.resetHistory();

        await handleRemind({ chatId: message.chat.id, args: ['10m', 'Check the oven'], reminderStore, telegramApiClient, logger: mockLogger });

        runner.assert(reminderStore.add.calledOnce, 'Should add reminder to store');
        const reminder = reminderStore.add.getCall(0).args[0];
        runner.assertEqual(reminder.chatId, 123, 'Reminder chatId should match');
        runner.assertEqual(reminder.message, 'Check the oven', 'Reminder message should match');
        runner.assert(reminder.remindAt > now + 9 * 60 * 1000, 'Reminder time should be in the future');

        runner.assert(telegramApiClient.sendMessage.calledOnce, 'Should send confirmation message');
        const sentMessage = telegramApiClient.sendMessage.getCall(0).args[1];
        runner.assert(sentMessage.startsWith('✅ Reminder set for'), 'Should confirm reminder scheduled');

        runner.assert(mockLogger.info.calledOnce, 'Logger should be called');
        clock.restore();
    });

    await runner.test('should handle errors when setting a reminder', async () => {
        const reminderStore = { add: sinon.stub().rejects(new Error('Store failed')) };
        const telegramApiClient = { sendMessage: sinon.stub().resolves() };
        const message = { chat: { id: 123 } };

        mockLogger.info.resetHistory();
        mockLogger.error.resetHistory();

        await handleRemind({ chatId: message.chat.id, args: ['5s', 'a quick one'], reminderStore, telegramApiClient, logger: mockLogger });

        runner.assert(reminderStore.add.calledOnce, 'Should attempt to add reminder');
        runner.assert(
            telegramApiClient.sendMessage.calledWith(123, '❌ Could not set reminder. Please try again later.'),
            'Should notify user about the failure'
        );
        runner.assert(mockLogger.error.calledOnce, 'Logger should record error');
    });
};
