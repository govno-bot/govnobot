const assert = require('assert');
const fs = require('fs');
const path = require('path');
const moderation = require('../../src/security/moderation');

const TEST_QUEUE_PATH = path.join(__dirname, '../../data/modqueue.json');
const TEST_CONFIG_PATH = path.join(__dirname, '../../data/moderation-config.json');

describe('Moderation Module', function() {
  beforeEach(() => {
    if (fs.existsSync(TEST_QUEUE_PATH)) fs.unlinkSync(TEST_QUEUE_PATH);
    if (fs.existsSync(TEST_CONFIG_PATH)) fs.unlinkSync(TEST_CONFIG_PATH);
  });

  it('should load default config if none exists', () => {
    const cfg = moderation.loadConfig();
    assert(cfg.enabled);
    assert(Array.isArray(cfg.flagCategories));
  });

  it('should save and load config', () => {
    const cfg = { enabled: false, flagCategories: ['SPAM'] };
    moderation.saveConfig(cfg);
    const loaded = moderation.loadConfig();
    assert.strictEqual(loaded.enabled, false);
    assert.deepStrictEqual(loaded.flagCategories, ['SPAM']);
  });

  it('should add flagged message to queue', async () => {
    // Fake fallbackChain that always returns TOXIC
    const fakeChain = { ask: async () => 'TOXIC' };
    const res = await moderation.moderateMessage({ userId: 1, username: 'u', text: 'bad', chatId: 2, messageId: 3 }, fakeChain);
    assert.strictEqual(res.result, 'TOXIC');
    assert(res.flagged);
    const queue = moderation.listQueue();
    assert(queue.length > 0);
    assert.strictEqual(queue[0].category, 'TOXIC');
  });

  it('should not flag OK message', async () => {
    const fakeChain = { ask: async () => 'OK' };
    const res = await moderation.moderateMessage({ userId: 1, username: 'u', text: 'hello', chatId: 2, messageId: 3 }, fakeChain);
    assert.strictEqual(res.result, 'OK');
    assert(!res.flagged);
    const queue = moderation.listQueue();
    assert.strictEqual(queue.length, 0);
  });

  it('should review and clear queue items', async () => {
    const fakeChain = { ask: async () => 'SPAM' };
    await moderation.moderateMessage({ userId: 1, username: 'u', text: 'spam', chatId: 2, messageId: 3 }, fakeChain);
    let queue = moderation.listQueue();
    assert(queue.length > 0);
    const id = queue[0].id;
    const ok = moderation.reviewQueueItem(id, 'approve');
    assert(ok);
    moderation.clearReviewed();
    queue = moderation.listQueue();
    assert(queue.length === 0);
  });
});
