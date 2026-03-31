const assert = require('assert');
const { pinCommand, unpinCommand, contextCommand, summaryCommand } = require('../../src/commands/public/command-pin');
const PinnedContextStore = require('../../src/storage/pinned-context-store');
const SummaryStore = require('../../src/storage/summary-store');
const HistoryStore = require('../../src/storage/history-store');
const path = require('path');

describe('Pin/Unpin/Context/Summary Commands', function() {
  // These are integration-style tests with in-memory mocks
  const chatId = 111;
  const config = { dataDir: path.join(__dirname, '../data/test-cmd') };
  let telegramApiClient, fallbackChain;

  beforeEach(() => {
    telegramApiClient = { messages: [], sendMessage: async function(chatId, text) { this.messages.push(text); }, sendChatAction: async () => {} };
    fallbackChain = { call: async () => ({ content: 'Summary result' }) };
    // Clean up test dirs
    ['history', 'pins', 'summary'].forEach(dir => {
      const d = path.join(config.dataDir, dir);
      if (require('fs').existsSync(d)) require('fs').rmSync(d, { recursive: true });
    });
  });

  it('pins and unpins a message', async () => {
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    await historyStore.saveHistory(chatId, [{ id: '1', content: 'A', role: 'user' }]);
    await pinCommand.handler({ chatId, args: ['1'], telegramApiClient, config });
    const pinStore = new PinnedContextStore(path.join(config.dataDir, 'pins'));
    const pins = await pinStore.loadPins(chatId);
    assert.strictEqual(pins.length, 1);
    await unpinCommand.handler({ chatId, args: ['1'], telegramApiClient, config });
    const pins2 = await pinStore.loadPins(chatId);
    assert.strictEqual(pins2.length, 0);
  });

  it('shows context window', async () => {
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    await historyStore.saveHistory(chatId, [{ id: '1', content: 'A', role: 'user' }]);
    const pinStore = new PinnedContextStore(path.join(config.dataDir, 'pins'));
    await pinStore.addPin(chatId, { id: '1', content: 'A' });
    const summaryStore = new SummaryStore(path.join(config.dataDir, 'summary'));
    await summaryStore.saveSummary(chatId, { text: 'Summary here' });
    telegramApiClient.messages = [];
    await contextCommand.handler({ chatId, telegramApiClient, config });
    assert(telegramApiClient.messages[0].includes('Pinned'));
    assert(telegramApiClient.messages[0].includes('Summary'));
    assert(telegramApiClient.messages[0].includes('Recent'));
  });

  it('generates and saves summary', async () => {
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    await historyStore.saveHistory(chatId, [{ id: '1', content: 'A', role: 'user' }]);
    telegramApiClient.messages = [];
    await summaryCommand.handler({ chatId, telegramApiClient, config, fallbackChain });
    assert(telegramApiClient.messages[0].includes('Summary result'));
    const summaryStore = new SummaryStore(path.join(config.dataDir, 'summary'));
    const summary = await summaryStore.loadSummary(chatId);
    assert.strictEqual(summary.text, 'Summary result');
  });
});
