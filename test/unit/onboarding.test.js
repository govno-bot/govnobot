// test/unit/onboarding.test.js
// TDD/BDD: User onboarding flow (/start and /help)

const CommandHandler = require('../../src/commands/command-handler');

module.exports.run = async function(runner) {
  const config = {
    telegram: {
      adminUsername: 'admin_user',
      adminChatId: 123456
    },
    ai: {
      defaultModel: 'gpt-4',
      availableModels: ['gpt-4', 'claude-3']
    },
    security: {
      shCommandWhitelist: []
    }
  };

  const logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };

  const rateLimiter = {
    checkLimit: () => ({ allowed: true })
  };

  // Test 1: /start command sends welcome message and instructions
  await runner.test('/start sends welcome message and instructions', async () => {
    let sentMessage = null;
    let parseMode = null;
    
    const client = {
      sendMessage: async (chatId, text, options) => {
        sentMessage = text;
        parseMode = options && options.parse_mode;
      }
    };

    const handler = new CommandHandler(client, config, logger, rateLimiter);
    const context = {
      chatId: 111,
      userId: 222,
      username: 'user',
      command: 'start',
      args: [],
      isAdmin: false
    };

    await handler.handleStart(context);

    runner.assert(sentMessage.includes('Welcome to GovnoBot'), 'Message should contain welcome text');
    runner.assert(sentMessage.includes('/ask'), 'Message should mention /ask command');
    runner.assert(sentMessage.includes('/help'), 'Message should mention /help command');
    runner.assert(parseMode === 'HTML', 'Message should use HTML parse mode');
  });

  // Test 2: /help command lists public commands for non-admin
  await runner.test('/help lists public commands for non-admin', async () => {
    let sentMessage = null;
    
    const client = {
      sendMessage: async (chatId, text, options) => {
        sentMessage = text;
      }
    };

    const handler = new CommandHandler(client, config, logger, rateLimiter);
    const context = {
      chatId: 111,
      userId: 222,
      username: 'user',
      command: 'help',
      args: [],
      isAdmin: false
    };

    await handler.handleHelp(context);

    runner.assert(sentMessage.includes('Public Commands'), 'Message should list public commands');
    runner.assert(sentMessage.includes('/ask'), 'Should list /ask');
    runner.assert(sentMessage.includes('/model'), 'Should list /model');
    runner.assert(!sentMessage.includes('Admin Commands'), 'Should NOT list admin commands for non-admin');
  });

  // Test 3: /help command lists admin commands for admin
  await runner.test('/help lists admin commands for admin', async () => {
    let sentMessage = null;
    
    const client = {
      sendMessage: async (chatId, text, options) => {
        sentMessage = text;
      }
    };

    const handler = new CommandHandler(client, config, logger, rateLimiter);
    const context = {
      chatId: 123456, // Matches adminChatId
      userId: 999,
      username: 'admin_user',
      command: 'help',
      args: [],
      isAdmin: true
    };

    await handler.handleHelp(context);

    runner.assert(sentMessage.includes('Public Commands'), 'Message should list public commands');
    runner.assert(sentMessage.includes('Admin Commands'), 'Message should list admin commands');
    runner.assert(sentMessage.includes('/sh'), 'Should list /sh command');
  });
};
