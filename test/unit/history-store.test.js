// test/unit/history-store.test.js
const fs = require('fs');
const path = require('path');
const HistoryStore = require('../../src/storage/history-store');

const TEST_DIR = path.join(__dirname, '../../data/locks-test/history-test');
const TEST_CHAT_ID = 1234567890;
const TEST_FILE = path.join(TEST_DIR, `${TEST_CHAT_ID}.json`);

function cleanup() {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR, { recursive: true });
}

module.exports.run = async function(runner) {
  cleanup();
  let store = new HistoryStore(TEST_DIR);
  runner.assert(fs.existsSync(TEST_DIR), 'should initialize with correct directory');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  let history = await store.loadHistory(TEST_CHAT_ID);
  runner.assertDeepEqual(history, [], 'should return empty array if no history exists');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  const messages = [ { role: 'user', text: 'hi' }, { role: 'bot', text: 'hello' } ];
  await store.saveHistory(TEST_CHAT_ID, messages);
  let loaded = await store.loadHistory(TEST_CHAT_ID);
  runner.assertDeepEqual(loaded, messages, 'should save and load history');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  await store.saveHistory(TEST_CHAT_ID, []);
  await store.appendMessage(TEST_CHAT_ID, { role: 'user', text: 'hi' });
  loaded = await store.loadHistory(TEST_CHAT_ID);
  runner.assertEqual(loaded.length, 1, 'should append a message to history (length 1)');
  runner.assertEqual(loaded[0].text, 'hi', 'should append a message to history (text)');
  await store.appendMessage(TEST_CHAT_ID, { role: 'bot', text: 'hello' });
  loaded = await store.loadHistory(TEST_CHAT_ID);
  runner.assertEqual(loaded.length, 2, 'should append a message to history (length 2)');
  runner.assertEqual(loaded[1].role, 'bot', 'should append a message to history (role)');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  await store.saveHistory(TEST_CHAT_ID, [ { role: 'user', text: 'hi' }, { role: 'bot', text: 'hello' } ]);
  await store.clearHistory(TEST_CHAT_ID);
  loaded = await store.loadHistory(TEST_CHAT_ID);
  runner.assertDeepEqual(loaded, [], 'should clear history');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  const many = [];
  for (let i = 0; i < 10; i++) many.push({ role: 'user', text: `msg${i}` });
  await store.saveHistory(TEST_CHAT_ID, many);
  const last3 = await store.loadHistory(TEST_CHAT_ID, 3);
  runner.assertEqual(last3.length, 3, 'should return last N messages if maxMessages is set (length)');
  runner.assertEqual(last3[0].text, 'msg7', 'should return last N messages (first)');
  runner.assertEqual(last3[2].text, 'msg9', 'should return last N messages (last)');

  cleanup();
  store = new HistoryStore(TEST_DIR);
  fs.writeFileSync(TEST_FILE, 'not json');
  loaded = await store.loadHistory(TEST_CHAT_ID);
  runner.assertDeepEqual(loaded, [], 'should handle corrupted file gracefully');

  cleanup();
}
