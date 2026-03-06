const assert = require('assert');
const { name, handler } = require('../../src/commands/public/command-imagine');

async function runTests() {
  console.log('LOADING COMMAND IMAGINE TEST');

  const mockBot = {
    messages: [],
    actions: [],
    photos: [],
    deleted: [],
    async sendMessage(chatId, text, opts) {
      this.messages.push({ chatId, text, ...opts });
      return { result: { message_id: 999 } };
    },
    async sendChatAction(chatId, action) {
      this.actions.push({ chatId, action });
    },
    async sendPhoto(chatId, photo, opts) {
      this.photos.push({ chatId, photo, ...opts });
    },
    async request(method, action, params) {
      if (action === 'deleteMessage') {
        this.deleted.push(params);
      }
    }
  };

  const mockAi = {
    async generateImage(prompt) {
      if (prompt === 'fail') throw new Error('AI Error');
      return 'http://example.com/image.png';
    }
  };

  console.log('  Running: /imagine with no prompt');
  await handler({ telegramApiClient: mockBot, chatId: 1, args: [], message: { message_id: 10 } });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('Usage:'));

  console.log('  Running: /imagine with prompt (success)');
  mockBot.messages = [];
  await handler({ telegramApiClient: mockBot, fallbackChain: mockAi, chatId: 1, args: ['cute', 'cat'], message: { message_id: 11 } });
  
  assert.strictEqual(mockBot.actions.length, 1);
  assert.strictEqual(mockBot.actions[0].action, 'upload_photo');
  
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('Generating image...'));
  
  assert.strictEqual(mockBot.photos.length, 1);
  assert.strictEqual(mockBot.photos[0].photo, 'http://example.com/image.png');
  assert(mockBot.photos[0].caption.includes('cute cat'));
  
  assert.strictEqual(mockBot.deleted.length, 1);
  assert.strictEqual(mockBot.deleted[0].message_id, 999);

  console.log('  Running: /imagine gracefully handles AI errors');
  mockBot.messages = [];
  mockBot.photos = [];
  await handler({ telegramApiClient: mockBot, fallbackChain: mockAi, chatId: 1, args: ['fail'], message: { message_id: 12 } });
  
  assert.strictEqual(mockBot.photos.length, 0);
  assert.strictEqual(mockBot.messages.length, 2); // Generating + Error
  assert(mockBot.messages[1].text.includes('Failed to generate image'));
  assert(mockBot.messages[1].text.includes('AI Error'));

  console.log('  ✓ test/unit/command-imagine.test.js\n');
}

module.exports = { run: runTests };
