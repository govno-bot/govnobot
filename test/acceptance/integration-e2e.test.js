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
}

// Test runner entrypoint
async function run(runner) {
  // Setup mock config, logger, client, rate limiter, command handler
  const config = new Config();
  const logger = new Logger('info');
  const client = new MockTelegramAPIClient();
  const rateLimiter = new RateLimiter(2, 5, logger); // low limits for test
  const commandHandler = new CommandHandler(client, config, logger, rateLimiter);

  // Helper: simulate update
  async function simulateUpdate(text, user = { id: 1, username: 'testuser', isAdmin: true }) {
    const update = {
      update_id: Math.floor(Math.random() * 100000),
      message: {
        message_id: Math.floor(Math.random() * 100000),
        chat: { id: user.id },
        from: user,
        text
      }
    };
    await commandHandler.handle(update);
    return client.sentMessages[client.sentMessages.length - 1]?.text;
  }

  // Test: /start
  let reply = await simulateUpdate('/start');
  runner.assert(reply && reply.toLowerCase().includes('welcome'), '/start returns welcome message');

  // Test: /help
  reply = await simulateUpdate('/help');
  runner.assert(reply && reply.toLowerCase().includes('command'), '/help returns command list');

  // Test: /ask
  reply = await simulateUpdate('/ask What is GovnoBot?');
  runner.assert(reply && reply.length > 0, '/ask returns a response');

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
  reply = await simulateUpdate('/sh echo test', { id: 1, username: 'admin', isAdmin: true });
  runner.assert(reply && (reply.toLowerCase().includes('test') || reply.toLowerCase().includes('output')), '/sh returns shell output for admin');

  // Test: /sh (non-admin)
  reply = await simulateUpdate('/sh echo test', { id: 2, username: 'user', isAdmin: false });
  runner.assert(reply && reply.toLowerCase().includes('admin'), '/sh returns error for non-admin');

  // Test: rate limiting
  await simulateUpdate('/ask 1');
  await simulateUpdate('/ask 2');
  reply = await simulateUpdate('/ask 3');
  runner.assert(reply && reply.toLowerCase().includes('rate limit'), 'rate limit triggers after limit');

  // Test: error handling (unknown command)
  reply = await simulateUpdate('/unknowncmd');
  runner.assert(reply && reply.toLowerCase().includes('unknown'), 'unknown command returns error');
}

module.exports = { run };
