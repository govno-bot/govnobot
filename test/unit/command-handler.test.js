// test/unit/command-handler.test.js
// TDD/BDD: Command Handler unit tests
module.exports.run = async function(runner) {

  await runner.test('/formdemo sends inline keyboard and handles response', async () => {
    const CommandHandler = require('../../src/commands/command-handler');
    let sentMsg = null;
    let answerCb = null;
    const fakeClient = {
      sendMessage: async (chatId, msg, opts) => { sentMsg = { msg, opts }; },
      answerCallbackQuery: async (id) => { answerCb = id; }
    };
    const config = { telegram: { adminUsername: 'admin' }, ai: { availableModels: [] } };
    const handler = new CommandHandler(fakeClient, config, {}, null, null, null, null,  null, null, { watchPlugins: false });
    // Test sending the form
    await handler.handle({ chatId: 42, text: '/formdemo' });
    runner.assert(sentMsg && sentMsg.msg.includes('favorite color'), 'Should send form question');
    runner.assert(sentMsg && sentMsg.opts && sentMsg.opts.reply_markup && sentMsg.opts.reply_markup.inline_keyboard, 'Should include inline keyboard');
    // Test handling a callback query (form response)
    sentMsg = null;
    answerCb = null;
    await handler.handle({ callbackQuery: { id: 'cbid1', data: 'form_color_blue', message: { chat: { id: 42 } } } });
    runner.assert(answerCb === 'cbid1', 'Should acknowledge callback query');
    runner.assert(sentMsg && sentMsg.msg.includes('You selected: Blue'), 'Should respond with selected color');
  });

    await runner.test('/settings shows and updates theme, verbosity, notifications', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      const SettingsStore = require('../../src/storage/settings-store');
      const fs = require('fs');
      const path = require('path');
      const tmpDir = path.join(__dirname, '../../data/test-settings-cmd');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const userId = 12345;
      const config = { dataDir: path.join(__dirname, '../../data'), ai: { defaultModel: 'gpt' }, telegram: { adminUsername: 'admin' } };
      let sentMsg = '';
      const fakeClient = { sendMessage: async (chatId, msg) => { sentMsg = msg; }, sendChatAction: async () => {} };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
      // Patch settings dir for this test
      handler.config.dataDir = path.join(__dirname, '../../data');
      // Clean up file
      const filePath = path.join(config.dataDir, 'settings', userId + '.json');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Show settings (should include new keys)
      await handler.handleSettings({ chatId: userId, args: [] });
      runner.assert(sentMsg.includes('Theme:'), 'Should show theme in settings');
      runner.assert(sentMsg.includes('Verbosity:'), 'Should show verbosity in settings');
      runner.assert(sentMsg.includes('Notifications:'), 'Should show notifications in settings');

      // Set theme to dark
      await handler.handleSettings({ chatId: userId, args: ['theme', 'dark'] });
      const store = new SettingsStore(userId, path.join(config.dataDir, 'settings'));
      const loaded = await store.load();
      runner.assert(loaded.theme === 'dark', 'Theme should be set to dark');

      // Set verbosity to verbose
      await handler.handleSettings({ chatId: userId, args: ['verbosity', 'verbose'] });
      const loaded2 = await store.load();
      runner.assert(loaded2.verbosity === 'verbose', 'Verbosity should be set to verbose');

      // Set notifications to mentions
      await handler.handleSettings({ chatId: userId, args: ['notifications', 'mentions'] });
      const loaded3 = await store.load();
      runner.assert(loaded3.notifications === 'mentions', 'Notifications should be set to mentions');

      // Invalid theme
      await handler.handleSettings({ chatId: userId, args: ['theme', 'blue'] });
      runner.assert(sentMsg.includes('Invalid theme'), 'Should reject invalid theme');

      // Invalid verbosity
      await handler.handleSettings({ chatId: userId, args: ['verbosity', 'super'] });
      runner.assert(sentMsg.includes('Invalid verbosity'), 'Should reject invalid verbosity');

      // Invalid notifications
      await handler.handleSettings({ chatId: userId, args: ['notifications', 'push'] });
      runner.assert(sentMsg.includes('Invalid notifications'), 'Should reject invalid notifications');

      // Clean up
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
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
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
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
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
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
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
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
        const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, mockNotepadStore, null, { watchPlugins: false });
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
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
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
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null,  null, null, { watchPlugins: false });
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
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null,  null, null, { watchPlugins: false });
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
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null,  null, null, { watchPlugins: false });
    
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
    const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null, null, null, { watchPlugins: false, pluginDir: tmpDir });

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
    const handler = new CommandHandler(mockClient, mockConfig, mockLogger, null, null, null, null,  null, null, { watchPlugins: false });
    
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
      
      const handler = new CommandHandler(mockClient, config, logger, null, null, null, null,  null, null, { watchPlugins: false });
      
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
      
      const handler = new CommandHandler(mockClient, config, logger, null, null, null, null,  null, null, { watchPlugins: false });
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

    await runner.test('/ephemeral starts ephemeral session and /end ends it, no disk writes', async () => {
      const CommandHandler = require('../../src/commands/command-handler');
      const fs = require('fs');
      const path = require('path');
      const userId = 55555;
      const config = { dataDir: path.join(__dirname, '../../data'), ai: { defaultModel: 'gpt' }, telegram: { adminUsername: 'admin' } };
      let sentMsgs = [];
      const fakeClient = { sendMessage: async (chatId, msg) => { sentMsgs.push(msg); }, sendChatAction: async () => {} };
      const handler = new CommandHandler(fakeClient, config, { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} }, null, null, null, null,  null, null, { watchPlugins: false });
      // Clean up any persistent file
      const filePath = path.join(config.dataDir, 'history', userId + '.json');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Start ephemeral session
      await handler.handle({ chatId: userId, text: '/ephemeral' });
      runner.assert(sentMsgs[sentMsgs.length-1].includes('Ephemeral session started'), 'Should confirm ephemeral session started');
      // Add a message (simulate chat)
      if (!handler.ephemeralSessions[userId]) throw new Error('Ephemeral session not tracked');
      handler.ephemeralSessions[userId].history.push({ role: 'user', content: 'test', timestamp: new Date().toISOString() });
      // End ephemeral session
      await handler.handle({ chatId: userId, text: '/end' });
      runner.assert(sentMsgs[sentMsgs.length-1].includes('Ephemeral session ended'), 'Should confirm ephemeral session ended');
      // Ensure no file was written
      runner.assert(!fs.existsSync(filePath), 'No history file should be written for ephemeral session');
    });
};
