// /pin <message_id> - Pin a message from history
// /unpin <message_id> - Unpin a pinned message
// /context - Show current context window (pins, summary, recent)
// /summary - Show or regenerate summary

const path = require('path');
const HistoryStore = require('../../storage/history-store');
const PinnedContextStore = require('../../storage/pinned-context-store');
const SummaryStore = require('../../storage/summary-store');

const pinCommand = {
  name: 'pin',
  handler: async (context) => {
    const { chatId, args, telegramApiClient, config } = context;
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    const pinStore = new PinnedContextStore(path.join(config.dataDir, 'pins'));
    if (!args[0]) {
      await telegramApiClient.sendMessage(chatId, 'Usage: /pin <message_id>');
      return;
    }
    const messageId = args[0];
    const history = await historyStore.loadHistory(chatId);
    const msg = history.find(m => m.id == messageId);
    if (!msg) {
      await telegramApiClient.sendMessage(chatId, `Message ID ${messageId} not found in history.`);
      return;
    }
    await pinStore.addPin(chatId, msg);
    await telegramApiClient.sendMessage(chatId, `Pinned message: "${msg.content.slice(0, 64)}..."`);
  }
};

const unpinCommand = {
  name: 'unpin',
  handler: async (context) => {
    const { chatId, args, telegramApiClient, config } = context;
    const pinStore = new PinnedContextStore(path.join(config.dataDir, 'pins'));
    if (!args[0]) {
      await telegramApiClient.sendMessage(chatId, 'Usage: /unpin <message_id>');
      return;
    }
    const messageId = args[0];
    await pinStore.removePin(chatId, messageId);
    await telegramApiClient.sendMessage(chatId, `Unpinned message ID: ${messageId}`);
  }
};

const contextCommand = {
  name: 'context',
  handler: async (context) => {
    const { chatId, telegramApiClient, config } = context;
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    const pinStore = new PinnedContextStore(path.join(config.dataDir, 'pins'));
    const summaryStore = new SummaryStore(path.join(config.dataDir, 'summary'));
    const pins = await pinStore.loadPins(chatId);
    const summary = await summaryStore.loadSummary(chatId);
    const history = await historyStore.loadHistory(chatId, 5);
    let text = '<b>Context Window</b>\n\n';
    if (pins.length) {
      text += '<b>Pinned:</b>\n' + pins.map(m => `#${m.id}: ${m.content.slice(0, 64)}`).join('\n') + '\n\n';
    }
    if (summary) {
      text += '<b>Summary:</b>\n' + summary.text + '\n\n';
    }
    if (history.length) {
      text += '<b>Recent:</b>\n' + history.map(m => `#${m.id}: ${m.content.slice(0, 64)}`).join('\n');
    }
    await telegramApiClient.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }
};

const summaryCommand = {
  name: 'summary',
  handler: async (context) => {
    const { chatId, telegramApiClient, config, fallbackChain } = context;
    const historyStore = new HistoryStore(path.join(config.dataDir, 'history'));
    const summaryStore = new SummaryStore(path.join(config.dataDir, 'summary'));
    const history = await historyStore.loadHistory(chatId, 50);
    if (!history.length) {
      await telegramApiClient.sendMessage(chatId, 'No history to summarize.');
      return;
    }
    // Summarize using fallbackChain (AI)
    const prompt = 'Summarize the following conversation:\n' + history.map(m => `${m.role}: ${m.content}`).join('\n');
    let summaryText = '';
    try {
      const aiResult = await fallbackChain.call([{ role: 'system', content: prompt }], { model: config.ai.defaultModel });
      summaryText = aiResult.content || aiResult;
    } catch (e) {
      summaryText = 'Failed to generate summary.';
    }
    await summaryStore.saveSummary(chatId, { text: summaryText, updated: new Date().toISOString() });
    await telegramApiClient.sendMessage(chatId, '<b>Summary:</b>\n' + summaryText, { parse_mode: 'HTML' });
  }
};

module.exports = { pinCommand, unpinCommand, contextCommand, summaryCommand };
