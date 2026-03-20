// test/unit/command-handler.test.js
// TDD/BDD: Command Handler unit tests
module.exports.run = async function(runner) {
  const pkg = require('../../package.json');
  const version = pkg.version;
    await runner.test('/sh as admin executes shell command and returns output', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: version };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, { watchPlugins: false });
      // Simulate admin user
      await handler.handle({ message: { text: '/sh echo test', from: { id: 1, username: 'admin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('test'), 'Should return shell output for /sh as admin');
    });

    await runner.test('/jack as admin executes script and returns confirmation', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      const fs = require('fs');
      const tempScriptPath = require('path').join(process.cwd(), 'sendMessageToJack.ps1');
      // Ensure script exists for check
      if (!fs.existsSync(tempScriptPath)) {
        fs.writeFileSync(tempScriptPath, '# dummy');
      }

      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { projectRoot: process.cwd(), security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: version };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, { watchPlugins: false });
      // Mock execFile to avoid actually running PowerShell
      handler.execFile = (cmd, args, opts, cb) => cb(null, 'OK', '');

      await handler.handle({ message: { text: '/jack hi there', from: { id: 1, username: 'admin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('Message sent to Jack'), 'Should confirm message sent to Jack');
    });

    await runner.test('/sh as non-admin returns admin error', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: version };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, { watchPlugins: false });
      // Simulate non-admin user
      await handler.handle({ message: { text: '/sh echo test', from: { id: 2, username: 'notadmin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('restricted'), 'Should return admin error for /sh as non-admin');
    });

    await runner.test('/agent as admin adds goal to notepad', async () => {
        const CommandHandler = require('../../src/commands/command-handler');
        let sentMessage = null;
        let internalGoals = [];
        const fakeClient = {
          sendMessage: async (chatId, msg) => { sentMessage = msg; },
          sendChatAction: async () => {}
        };
        const mockNotepadStore = {
            load: async () => ({ goals: internalGoals }),
            update: async (data) => { if (data.goals) internalGoals = data.goals; }
        };
        const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: version };
        const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, mockNotepadStore, { watchPlugins: false });
        await handler.handle({ message: { text: '/agent hello world', from: { id: 1, username: 'admin' }, chat: { id: 1 } } });
        runner.assert(sentMessage && sentMessage.includes('Goal added'), 'Should confirm goal added');
        runner.assert(internalGoals.includes('hello world'), 'Goal should be stored in notepad');
      });    await runner.test('/agent as non-admin returns admin error', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let sentMessage = null;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessage = msg; },
        sendChatAction: async () => {}
      };
      const config = { security: { shCommandWhitelist: ['echo'] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: ['gpt'] }, version: version };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, { watchPlugins: false });
      await handler.handle({ message: { text: '/agent hello world', from: { id: 2, username: 'notadmin' }, chat: { id: 1 } } });
      runner.assert(sentMessage && sentMessage.includes('restricted'), 'Should return admin error for /agent as non-admin');
    });
  // Example: test command registration and routing
  await runner.test('registers and routes public commands', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let called = false;
    const mockLogger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const mockConfig = { telegram: { adminUsername: 'admin', adminChatId: 123 }, ai: { availableModels: ['gpt'] }, security: { shCommandWhitelist: [] } };
    const mockClient = { sendMessage: async () => {}, sendChatAction: async () => {} };
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null, null, { watchPlugins: false });
    handler.registerPublicCommand('test', () => { called = true; });
    await handler.handle({ message: { text: '/test', from: { id: 1 }, chat: { id: 1 } } });
    runner.assert(called, 'Handler should be called for /test');
  });

  await runner.test('registers and routes admin commands', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let called = false;
    const mockLogger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const mockConfig = { telegram: { adminUsername: 'admin', adminChatId: 123 }, ai: { availableModels: ['gpt'] }, security: { shCommandWhitelist: [] } };
    const mockClient = { sendMessage: async () => {}, sendChatAction: async () => {} };
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null, null, { watchPlugins: false });
    handler.registerAdminCommand('admin', () => { called = true; });
    // Simulate admin user
    await handler.handle({ message: { text: '/admin', from: { id: 42, username: 'admin' }, chat: { id: 1 } } });
    runner.assert(called, 'Admin handler should be called for /admin');
  });

  await runner.test('returns error for unknown command', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let error;
    const mockLogger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const mockConfig = { telegram: { adminUsername: 'admin', adminChatId: 123 }, ai: { availableModels: ['gpt'] }, security: { shCommandWhitelist: [] } };
    let sentMsg = null;
    const mockClient = { sendMessage: async (chatId, msg) => { sentMsg = msg; }, sendChatAction: async () => {} };
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null, null, { watchPlugins: false });
    
    await handler.handle({ message: { text: '/unknown', from: { id: 1, username: 'user' }, chat: { id: 1 } } });
    
    runner.assert(sentMsg && sentMsg.includes('Unknown command'), 'Should send unknown command message');
  });

  await runner.test('loads plugin commands from plugins directory and supports reload', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'govnobot-plugin-'));
    const pluginPath = path.join(tmpDir, 'test-plugin.js');

    // Create a simple plugin that registers a command
    fs.writeFileSync(pluginPath, `exports.init = function(bot) {\n  bot.registerPublicCommand('plugintest', async (context) => {\n    await context.telegramApiClient.sendMessage(context.chatId, 'plugin v1');\n  });\n};\n`);

    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessage = msg; },
      sendChatAction: async () => {}
    };

    const config = { telegram: { adminUsername: 'admin', adminChatId: 123 }, ai: { availableModels: ['gpt'] }, security: { shCommandWhitelist: [] }, version: '1.0.0' };
    const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, { watchPlugins: false, pluginDir: tmpDir });

    // Load plugins manually (watcher disabled)
    handler.loadPlugins();
    await handler.handle({ message: { text: '/plugintest', from: { id: 1, username: 'user' }, chat: { id: 1 } } });
    runner.assert(sentMessage === 'plugin v1', 'Should execute plugin command from loaded plugin');

    // Update the plugin file and reload
    fs.writeFileSync(pluginPath, `exports.init = function(bot) {\n  bot.registerPublicCommand('plugintest', async (context) => {\n    await context.telegramApiClient.sendMessage(context.chatId, 'plugin v2');\n  });\n};\n`);
    handler.reloadPlugin(pluginPath);
    sentMessage = null;
    await handler.handle({ message: { text: '/plugintest', from: { id: 1, username: 'user' }, chat: { id: 1 } } });
    runner.assert(sentMessage === 'plugin v2', 'Should reload plugin command after file change');
  });

  await runner.test('handles execution errors gracefully', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    const mockLogger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const mockConfig = { telegram: { adminUsername: 'admin', adminChatId: 123 }, ai: { availableModels: ['gpt'] }, security: { shCommandWhitelist: [] } };
    let sentMsg = null;
    const mockClient = { sendMessage: async (chatId, msg) => { sentMsg = msg; }, sendChatAction: async () => {} };
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null, null, { watchPlugins: false });
    
    // Register a command that throws an error
    handler.registerPublicCommand('error', () => { throw new Error('Boom'); });
    
    await handler.handle({ message: { text: '/error', from: { id: 1, username: 'user' }, chat: { id: 1 } } });
    
    runner.assert(sentMsg && sentMsg.includes('An error occurred processing your command'), 'Should send friendly error message on crash');
  });

  await runner.test('responds to inline mentions without prefix', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let handledArgs = null;
      
      const mockClient = { sendMessage: async () => {}, sendChatAction: async () => {} };
      const config = { security: { shCommandWhitelist: [] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: [] }, version: '1.0.0' };
      const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
      
      const handler = new CommandHandler(mockClient, config, logger, null, null, null, null, null, { watchPlugins: false });
      
      // Inject bot info
      handler.setBotInfo({ id: 999, username: 'TestBot' });
      
      // Mock handleAsk to verify it gets routed correctly
      handler.handleAsk = async (context) => {
        handledArgs = context.args;
      };
      
      // Test mentioning @TestBot
      await handler.handle({
        message: {
          text: 'Hello @TestBot how are you?',
          from: { id: 1, username: 'user' },
          chat: { id: 1 }
        }
      });
      
      runner.assert(handledArgs !== null, 'Should have routed to handleAsk');
      runner.assert(handledArgs.join(' ') === 'Hello how are you?', 'Should remove bot username from query');
    });

    await runner.test('responds to direct replies without prefix', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      let handledArgs = null;
      
      const mockClient = { sendMessage: async () => {}, sendChatAction: async () => {} };
      const config = { security: { shCommandWhitelist: [] }, telegram: { adminUsername: 'admin' }, ai: { availableModels: [] }, version: '1.0.0' };
      const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
      
      const handler = new CommandHandler(mockClient, config, logger, null, null, null, null, null, { watchPlugins: false });
      handler.setBotInfo({ id: 999, username: 'TestBot' });
      handler.handleAsk = async (context) => {
        handledArgs = context.args;
      };
      
      // Test replying to bot
      await handler.handle({
        message: {
          text: 'Is this working?',
          reply_to_message: {
            from: { id: 999, is_bot: true, username: 'TestBot' }
          },
          from: { id: 1, username: 'user' },
          chat: { id: 1 }
        }
      });
      
      runner.assert(handledArgs !== null, 'Should have routed to handleAsk on reply');
      runner.assert(handledArgs.join(' ') === 'Is this working?', 'Should pass query properly');
    });
};
