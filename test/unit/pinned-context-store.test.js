const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PinnedContextStore = require('../../src/storage/pinned-context-store');

const TEST_DIR = path.join(__dirname, '../data/test-pins');
const CHAT_ID = 12345;

describe('PinnedContextStore', function() {
  let store;
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
    store = new PinnedContextStore(TEST_DIR);
  });

  it('should add and load pins', async () => {
    await store.addPin(CHAT_ID, { id: 'm1', content: 'Important message' });
    const pins = await store.loadPins(CHAT_ID);
    assert.strictEqual(pins.length, 1);
    assert.strictEqual(pins[0].content, 'Important message');
  });

  it('should remove a pin', async () => {
    await store.addPin(CHAT_ID, { id: 'm1', content: 'A' });
    await store.addPin(CHAT_ID, { id: 'm2', content: 'B' });
    await store.removePin(CHAT_ID, 'm1');
    const pins = await store.loadPins(CHAT_ID);
    assert.strictEqual(pins.length, 1);
    assert.strictEqual(pins[0].id, 'm2');
  });

  it('should clear pins', async () => {
    await store.addPin(CHAT_ID, { id: 'm1', content: 'A' });
    await store.clearPins(CHAT_ID);
    const pins = await store.loadPins(CHAT_ID);
    assert.strictEqual(pins.length, 0);
  });
});
