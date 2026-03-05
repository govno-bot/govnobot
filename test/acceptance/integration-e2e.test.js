/**
 * Integration/E2E test for GovnoBot main user flows (no external dependencies)
 * Covers: /start, /help, /ask, /model, /history, /settings, /status, /version, /sh (admin), error handling, rate limiting
 * Simulates Telegram API and bot entrypoint
 */

const path = require('path');
const assert = require('assert');
const fs = require('fs');

// Import bot entrypoint and helpers
const bot = require(path.join(__dirname, '../../src/index.js'));
const TelegramAPIClient = require(path.join(__dirname, '../../src/telegram/api-client.js'));
const CommandHandler = require(path.join(__dirname, '../../src/commands/command-handler.js'));
const RateLimiter = require(path.join(__dirname, '../../src/security/rate-limiter.js'));
const Logger = require(path.join(__dirname, '../../src/utils/logger.js'));
const Config = require(path.join(__dirname, '../../src/config.js'));

// Mocks
class MockTelegramAPIClient {
  constructor() {
    this.sentMessages = [];
  }
  async sendMessage(chatId, text) {
    this.sentMessages.push({ chatId, text });
    return { ok: true, result: { chat: { id: chatId }, text } };
  }
  async sendChatAction(chatId, action) {
    return { ok: true };
  }
}

// Test runner entrypoint
async function run(runner) {
  // Setup mock config, logger, client, rate limiter, command handler
  const config = new Config();
  const logger = new Logger('info');
  const client = new MockTelegramAPIClient();
  const rateLimiter = new RateLimiter(100, 1000, logger); // High limits for functional tests
  // Mock fallback chain
  const fallbackChain = {
    call: async (input) => `Mock response to: ${input}`
  };
  const commandHandler = new CommandHandler(client, config, logger, rateLimiter, fallbackChain);

  // Helper: create update
  function createUpdate(text, user = { id: 1, username: 'testuser' }) {
    return {
      update_id: Math.floor(Math.random() * 100000),
      message: {
        message_id: Math.floor(Math.random() * 100000),
        chat: { id: user.id },
        from: user,
        text
      }
    };
  }

  // Helper: simulate update with specific handler
  async function simulateUpdateWithHandler(handler, text, user) {
    await handler.handle(createUpdate(text, user));
    return client.sentMessages[client.sentMessages.length - 1]?.text;
  }

  // Helper: simulate update with default handler
  async function simulateUpdate(text, user) {
    return simulateUpdateWithHandler(commandHandler, text, user);
  }

  // Test: /start
  let reply = await simulateUpdate('/start');
  runner.assert(reply && reply.toLowerCase().includes('welcome'), '/start returns welcome message');

  // Test: /help
  reply = await simulateUpdate('/help');
  runner.assert(reply && reply.toLowerCase().includes('command'), '/help returns command list');

  // Test: /ask
  reply = await simulateUpdate('/ask What is GovnoBot?');
  runner.assert(reply && reply.length > 0 && !reply.includes('Rate limit'), '/ask returns a response');

  // Test: /model
  reply = await simulateUpdate('/model');
  runner.assert(reply && reply.toLowerCase().includes('model'), '/model returns model info');

  // Test: /history
  reply = await simulateUpdate('/history');
  runner.assert(reply && reply.toLowerCase().includes('history'), '/history returns history');

  // Test: /settings
  reply = await simulateUpdate('/settings');
  runner.assert(reply && reply.toLowerCase().includes('setting'), '/settings returns settings');

  // Test: /status
  reply = await simulateUpdate('/status');
  runner.assert(reply && reply.toLowerCase().includes('uptime'), '/status returns uptime');

  // Test: /version
  reply = await simulateUpdate('/version');
  runner.assert(reply && reply.toLowerCase().includes('version'), '/version returns version');

  // Test: /sh (admin)
  // Need to mock isAdmin returning true in CommandHandler or pass admin user that matches config
  // The CommandHandler.isAdmin checks config.telegram.adminUsername.
  // We need to set it in config.
  config.telegram.adminUsername = 'admin';
  config.security.shCommandWhitelist = ['echo'];
  const shMsgCountBefore = client.sentMessages.length;
  await commandHandler.handle(createUpdate('/sh echo test', { id: 1, username: 'admin' }, { id: 1 }));
  
  // Wait for async shell execution
  await new Promise(resolve => setTimeout(resolve, 500));
  
  reply = client.sentMessages[client.sentMessages.length - 1]?.text;
  if (client.sentMessages.length === shMsgCountBefore) {
      console.log('DEBUG: No new message received for /sh');
  }
  
  runner.assert(reply && (reply.toLowerCase().includes('test') || reply.toLowerCase().includes('output')), '/sh returns shell output for admin');

  // Test: /sh (non-admin)
  reply = await simulateUpdate('/sh echo test', { id: 2, username: 'user' });
  runner.assert(reply && reply.toLowerCase().includes('admin'), '/sh returns error for non-admin');

  // Test: rate limiting
  // Create a strict rate limiter for this test
  const strictRateLimiter = new RateLimiter(2, 5, logger);
  const strictCommandHandler = new CommandHandler(client, config, logger, strictRateLimiter, fallbackChain);
  const spamUser = { id: 999, username: 'spammer' };

  // 1. Allowed
  reply = await simulateUpdateWithHandler(strictCommandHandler, '/ask 1', spamUser);
  runner.assert(reply && !reply.includes('Rate limit'), 'Request 1 allowed');
  
  // 2. Allowed
  reply = await simulateUpdateWithHandler(strictCommandHandler, '/ask 2', spamUser);
  runner.assert(reply && !reply.includes('Rate limit'), 'Request 2 allowed');

  // 3. Blocked (Limit is 2)
  reply = await simulateUpdateWithHandler(strictCommandHandler, '/ask 3', spamUser);
  runner.assert(reply && reply.toLowerCase().includes('rate limit'), 'Request 3 blocked by rate limit');

  // Test: error handling (unknown command)
  reply = await simulateUpdate('/unknowncmd');
  runner.assert(reply && reply.toLowerCase().includes('unknown'), 'unknown command returns error');
}

module.exports = { run };
