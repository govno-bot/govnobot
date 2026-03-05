// test/unit/command-handler.test.js
// TDD/BDD: Command Handler unit tests
module.exports.run = async function(runner) {
    await runner.test('/sh as admin executes shell command and returns output', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: '1.0.0' };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, {});
      // Simulate admin user
      await handler.handle({ message: { text: '/sh echo test', from: { id: 1, username: 'admin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('test'), 'Should return shell output for /sh as admin');
    });

    await runner.test('/sh as non-admin returns admin error', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: '1.0.0' };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, {});
      // Simulate non-admin user
      await handler.handle({ message: { text: '/sh echo test', from: { id: 2, username: 'notadmin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('restricted'), 'Should return admin error for /sh as non-admin');
    });

    await runner.test('/agent as admin echoes prompt', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: '1.0.0' };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, {});
      await handler.handle({ message: { text: '/agent hello world', from: { id: 1, username: 'admin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('Prompt received'), 'Should echo prompt for /agent as admin');
    });

    await runner.test('/agent as non-admin returns admin error', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: '1.0.0' };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, {});
      await handler.handle({ message: { text: '/agent hello world', from: { id: 2, username: 'notadmin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('restricted'), 'Should return admin error for /agent as non-admin');
    });
  // Example: test command registration and routing
  await runner.test('registers and routes public commands', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let called = false;
    const handler = new CommandHandler({}, {}, {}, {});
    handler.registerPublicCommand('test', () => { called = true; });
    await handler.handle({ message: { text: '/test', from: { id: 1 }, chat: { id: 1 } } });
    runner.assert(called, 'Handler should be called for /test');
  });

  await runner.test('registers and routes admin commands', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let called = false;
    const handler = new CommandHandler({}, {}, {}, {});
    handler.registerAdminCommand('admin', () => { called = true; });
    // Simulate admin user
    await handler.handle({ message: { text: '/admin', from: { id: 42 }, chat: { id: 1 } } }, true);
    runner.assert(called, 'Admin handler should be called for /admin');
  });

  await runner.test('returns error for unknown command', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let error;
    const handler = new CommandHandler({}, {}, {}, {});
    try {
      await handler.handle({ message: { text: '/unknown', from: { id: 1 }, chat: { id: 1 } } });
    } catch (e) {
      error = e;
    }
    runner.assert(error, 'Should throw error for unknown command');
  });
};
