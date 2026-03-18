const assert = require('assert');
const ProactiveAgent = require('../../src/mood/proactive-agent.js');

const createMockLogger = () => {
    const logs = [];
    const logger = (level, ...args) => logs.push({ level, args });
    logger.info = (...args) => logger('info', ...args);
    logger.warn = (...args) => logger('warn', ...args);
    logger.error = (...args) => logger('error', ...args);
    logger.getLogs = () => logs;
    return logger;
};

const createMockTelegramApiClient = () => {
    const messages = [];
    return {
        sendMessage: async (chatId, text) => {
            messages.push({ chatId, text });
            return Promise.resolve();
        },
        getMessages: () => messages,
    };
};

const run = (runner) => {
    const tests = {
        'should initialize correctly': () => {
            const logger = createMockLogger();
            const agent = new ProactiveAgent({ logger });
            runner.assert(agent.isRunning === false, 'should not be running initially');
            runner.assertEqual(agent.currentMood, 'curious', 'initial mood should be curious');
        },

        'should start and schedule an action': () => {
            const logger = createMockLogger();
            const agent = new ProactiveAgent({ logger });
            agent.start();
            runner.assert(agent.isRunning, 'agent should be running');
            const logs = logger.getLogs();
            runner.assert(logs.some(log => log.args[0].includes('ProactiveAgent started')), 'should log start message');
            runner.assert(logs.some(log => log.args[0].includes('Next proactive action scheduled')), 'should schedule next action');
            agent.stop();
        },

        'should stop and clear the timer': () => {
            const logger = createMockLogger();
            const agent = new ProactiveAgent({ logger });
            agent.start();
            agent.stop();
            runner.assert(!agent.isRunning, 'agent should not be running');
            runner.assertEqual(agent.timer, null, 'timer should be cleared');
            const logs = logger.getLogs();
            runner.assert(logs.some(log => log.args[0].includes('ProactiveAgent stopped')), 'should log stop message');
        },

        'should change mood on trigger': () => {
            const agent = new ProactiveAgent({ logger: createMockLogger() });
            const initialMood = agent.currentMood;
            let moodChanged = false;
            for (let i = 0; i < 10; i++) { // Retry up to 10 times
                agent.updateMood();
                if (agent.currentMood !== initialMood) {
                    moodChanged = true;
                    break;
                }
            }
            runner.assert(moodChanged, 'Mood should have changed after multiple attempts');
            runner.assert(agent.moods.includes(agent.currentMood), 'mood should be one of the available moods');
        },

        'should generate a message based on mood': async () => {
            const fallbackChain = {
                call: async () => `{"notepad": "updating notes", "message": "I'm feeling a bit mischievous!"}`
            };
            const mockNotepadStore = {
                load: async () => ({ notes: "" }),
                update: async () => {}
            };
            const agent = new ProactiveAgent({ logger: createMockLogger(), fallbackChain, notepadStore: mockNotepadStore });
            agent.currentMood = 'playful';
            const message = await agent.generateMessage();
            runner.assertEqual(message, "I'm feeling a bit mischievous!", 'should generate a playful message');
        },

        'should send a proactive message': async () => {
            const logger = createMockLogger();
            const telegramApiClient = createMockTelegramApiClient();
            const adminChatId = '12345';
            const mockNotepadStore = {
                load: async () => ({ notes: "" }),
                update: async () => {}
            };
            const fallbackChain = {
                call: async () => `{"notepad": "updating notes", "message": "I feel happy!"}`
            };
            const agent = new ProactiveAgent({ logger, telegramApiClient, adminChatId, fallbackChain, notepadStore: mockNotepadStore });

            agent.currentMood = 'happy';
            const message = await agent.generateMessage();
            await agent.sendMessage(message);

            const sentMessages = telegramApiClient.getMessages();
            runner.assertEqual(sentMessages.length, 1, 'should send one message');
            runner.assertEqual(sentMessages[0].chatId, adminChatId, 'should send to admin chat');
            runner.assert(sentMessages[0].text.includes('*Proactive Message (happy):*'), 'message should include mood');
            runner.assert(sentMessages[0].text.includes(message), 'message should include generated text');

            const logs = logger.getLogs();
            runner.assert(logs.some(log => log.args[0].includes('Sent proactive message to admin chat')), 'should log sent message');
        },

        'should not send message if adminChatId is not set': async () => {
            const logger = createMockLogger();
            const telegramApiClient = createMockTelegramApiClient();
            const agent = new ProactiveAgent({ logger, telegramApiClient });

            await agent.sendMessage("test message");

            const sentMessages = telegramApiClient.getMessages();
            runner.assertEqual(sentMessages.length, 0, 'should not send any messages');

            const logs = logger.getLogs();
            runner.assert(logs.some(log => log.args[0].includes('No admin chat ID configured')), 'should log warning');
        },
    };

    Object.entries(tests).forEach(([name, testFn]) => {
        runner.test(name, testFn);
    });
};

module.exports = { run };

