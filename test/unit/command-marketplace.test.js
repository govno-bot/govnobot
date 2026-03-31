// Unit tests for /marketplace command
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MacroStore = require('../../src/storage/macro-store');
const marketplaceCommand = require('../../src/commands/public/command-marketplace');

const MARKETPLACE_DIR = path.join(__dirname, '../../data/marketplace');

describe('Marketplace Command', function() {
  const userId = 'testuser';
  const chatId = 12345;
  const telegramApiClient = {
    sent: [],
    sendMessage: async function(chatId, text, opts) { this.sent.push({ chatId, text, opts }); }
  };
  beforeEach(() => {
    telegramApiClient.sent = [];
    if (!fs.existsSync(MARKETPLACE_DIR)) fs.mkdirSync(MARKETPLACE_DIR, { recursive: true });
    // Clean up marketplace dir
    for (const f of fs.readdirSync(MARKETPLACE_DIR)) fs.unlinkSync(path.join(MARKETPLACE_DIR, f));
    // Clean up user macros
    MacroStore.deleteMacro(userId, 'testmacro', 'user').catch(()=>{});
  });

  it('should show usage with no args', async () => {
    await marketplaceCommand.handler({ chatId, userId, args: [], telegramApiClient });
    assert(/Usage/.test(telegramApiClient.sent[0].text));
  });

  it('should not publish missing macro', async () => {
    await marketplaceCommand.handler({ chatId, userId, args: ['publish', 'testmacro'], telegramApiClient });
    assert(/not found/.test(telegramApiClient.sent[0].text));
  });

  it('should publish, list, info, and install macro', async () => {
    // Add macro to user
    await MacroStore.addMacro(userId, 'testmacro', 'echo hi', 'user');
    // Publish
    await marketplaceCommand.handler({ chatId, userId, args: ['publish', 'testmacro', 'desc'], telegramApiClient });
    assert(/published/.test(telegramApiClient.sent[0].text));
    // List
    await marketplaceCommand.handler({ chatId, userId, args: ['list'], telegramApiClient });
    assert(/testmacro/.test(telegramApiClient.sent[1].text));
    // Info
    await marketplaceCommand.handler({ chatId, userId, args: ['info', 'testmacro'], telegramApiClient });
    assert(/testmacro/.test(telegramApiClient.sent[2].text));
    // Install
    await MacroStore.deleteMacro(userId, 'testmacro', 'user');
    await marketplaceCommand.handler({ chatId, userId, args: ['install', 'testmacro'], telegramApiClient });
    assert(/installed/.test(telegramApiClient.sent[3].text));
  });

  it('should handle not found on info/install', async () => {
    await marketplaceCommand.handler({ chatId, userId, args: ['info', 'notfound'], telegramApiClient });
    assert(/not found/.test(telegramApiClient.sent[0].text));
    await marketplaceCommand.handler({ chatId, userId, args: ['install', 'notfound'], telegramApiClient });
    assert(/not found/.test(telegramApiClient.sent[1].text));
  });
});
