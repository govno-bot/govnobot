const assert = require('assert');
const gmCommand = require('../../src/commands/public/command-gm');
const path = require('path');
const fs = require('fs');

module.exports.run = async function(runner) {
  let context, sentMessages, chatActions;

  const reset = () => {
    sentMessages = [];
    chatActions = [];
    context = {
      chatId: 100,
      args: [],
      config: { dataDir: path.join(__dirname, '..', 'data', 'gmtestdata') },
      logger: { error: () => {} },
      fallbackChain: {
        invoke: async (payload) => {
          const userMessage = payload.messages.find(m => m.role === 'user');
          if (userMessage && userMessage.content.includes('fail')) throw new Error('AI Error');
          return { content: 'AI Response' };
        }
      },
      telegramApiClient: {
        sendMessage: async (chatId, text, opts) => sentMessages.push({ text, opts }),
        sendChatAction: async (chatId, action) => chatActions.push(action)
      }
    };
  };

  const cleanup = () => {
    const d = path.join(__dirname, '..', 'data', 'gmtestdata', 'campaigns');
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  };

  // Test 1: usage info
  reset();
  await gmCommand.handler(context);
  await runner.assert(sentMessages[0].text.includes('Game Master Mode'), 'should send usage info if no args provided');

  // Test 2: start campaign
  reset();
  context.args = ['start', 'fantasy'];
  await gmCommand.handler(context);
  await runner.assertEqual(chatActions[0], 'typing', 'should send typing action');
  await runner.assert(sentMessages[0].text.includes('Campaign Started: fantasy'), 'should start a stateful campaign');

  // Test 3: stop campaign
  reset();
  context.args = ['stop'];
  await gmCommand.handler(context);
  await runner.assert(sentMessages[0].text.includes('Campaign stopped'), 'should stop a campaign');

  // Test 4: action in campaign
  reset();
  context.args = ['start', 'sci-fi'];
  await gmCommand.handler(context);
  context.args = ['action', 'open door'];
  await gmCommand.handler(context);
  await runner.assert(sentMessages[1].text.includes('Campaign: sci-fi'), 'should take action in a campaign');

  // Test 5: handle stateless
  reset();
  context.args = ['a', 'random', 'scenario'];
  await gmCommand.handler(context);
  await runner.assert(sentMessages[0].text.includes('Scenario:'), 'should handle stateless scenario');

  // Test 6: handle AI failure
  reset();
  context.args = ['fail']; // stateless failure
  await gmCommand.handler(context);
  await runner.assert(sentMessages[0].text.includes('AI is currently unavailable'), 'should handle AI failure in stateless scenario');

  cleanup();
};