const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SummaryStore = require('../../src/storage/summary-store');

const TEST_DIR = path.join(__dirname, '../data/test-summary');
const CHAT_ID = 54321;

describe('SummaryStore', function() {
  let store;
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
    store = new SummaryStore(TEST_DIR);
  });

  it('should save and load summary', async () => {
    await store.saveSummary(CHAT_ID, { text: 'Summary here', updated: 'now' });
    const summary = await store.loadSummary(CHAT_ID);
    assert.strictEqual(summary.text, 'Summary here');
  });

  it('should clear summary', async () => {
    await store.saveSummary(CHAT_ID, { text: 'To clear', updated: 'now' });
    await store.clearSummary(CHAT_ID);
    const summary = await store.loadSummary(CHAT_ID);
    assert.strictEqual(summary, null);
  });
});
