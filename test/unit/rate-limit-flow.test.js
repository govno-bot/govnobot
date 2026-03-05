const CommandHandler = require('../../src/commands/command-handler');

/**
 * Test Suite: Rate Limit Flow
 * Ensures that users are blocked when exceeding rate limits
 */

async function run(runner) {
  console.log('\n⏳ Testing Rate Limit Flow');

  // Helper to create mocks
  const createMocks = () => {
    const client = {
      sendMessage: async () => {},
      messages: []
    };
    // Spy on sendMessage
    client.sendMessage = async (chatId, text) => {
      client.messages.push({ chatId, text });
      return { message_id: 123 };
    };

    const config = {
      telegram: { adminUsername: 'admin' }
    };

    const logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };

    const rateLimiter = {
      allowed: true,
      lastChatId: null,
      isAllowed: (chatId) => {
        rateLimiter.lastChatId = chatId;
        return rateLimiter.allowed;
      },
      getStatus: (chatId) => ({
        requestsThisMinute: 11,
        requestsThisHour: 101,
        remainingMinute: 0,
        remainingHour: 0,
        minutesUntilReset: 1,
        hoursUntilReset: 1
      })
    };

    const fallbackChain = {};

    return { client, config, logger, rateLimiter, fallbackChain };
  };

  // Test 1: Rate limit check allows request when under limit
  {
    const { client, config, logger, rateLimiter, fallbackChain } = createMocks();
    const handler = new CommandHandler(client, config, logger, rateLimiter, fallbackChain);
    
    // Mock user update
    const update = {
      message: {
        chat: { id: 123 },
        from: { id: 456, username: 'user' },
        text: '/start'
      }
    };

    await handler.handle(update);

    // Verify rate limiter was checked
    runner.assertEqual(rateLimiter.lastChatId, 123, 'Rate limiter checked with correct chatId');
    
    // Verify command executed (welcome message sent)
    const welcomeMessage = client.messages.find(m => m.text.includes('Welcome to GovnoBot'));
    runner.assert(welcomeMessage !== undefined, 'Command executed when allowed');
  }

  // Test 2: Rate limit check blocks request when over limit
  {
    const { client, config, logger, rateLimiter, fallbackChain } = createMocks();
    rateLimiter.allowed = false; // Simulate rate limit exceeded
    
    const handler = new CommandHandler(client, config, logger, rateLimiter, fallbackChain);
    
    const update = {
      message: {
        chat: { id: 789 },
        from: { id: 101, username: 'spammer' },
        text: '/start'
      }
    };

    await handler.handle(update);

    // Verify rate limiter was checked
    runner.assertEqual(rateLimiter.lastChatId, 789, 'Rate limiter checked');
    
    // Verify warning message sent
    const warningMessage = client.messages.find(m => m.text.includes('Rate limit exceeded'));
    runner.assert(warningMessage !== undefined, 'Warning message sent to user');
    
    // Verify command did NOT execute (no welcome message)
    const welcomeMessage = client.messages.find(m => m.text.includes('Welcome to GovnoBot'));
    runner.assert(welcomeMessage === undefined, 'Command not executed when blocked');

    // Verify only one message sent (the warning)
    runner.assertEqual(client.messages.length, 1, 'Only rate limit warning sent');
  }
}

module.exports = { run };
