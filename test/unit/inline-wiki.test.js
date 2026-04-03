const assert = require('assert');

async function runTests() {
  console.log('LOADING INLINE WIKI TEST');

  const wikiPath = require.resolve('../../src/ai/wikipedia');
  const mockWiki = {
    fetchWikipediaSummary: async (q) => {
      if (!q) return null;
      if (q === 'Mercury (planet)') return { title: 'Mercury (planet)', extract: 'Mercury is the smallest planet in the Solar System.', url: 'https://en.wikipedia.org/wiki/Mercury_(planet)' };
      return null;
    },
    searchWikipedia: async (q) => {
      if (!q) return null;
      if (/^Mercury/i.test(q)) return 'Mercury (planet)';
      return null;
    }
  };
  require.cache[wikiPath] = { exports: mockWiki };

  const CommandHandler = require('../../src/commands/command-handler');

  const mockBot = {
    messages: [],
    async sendMessage(chatId, text, opts) { this.messages.push({ chatId, text, opts }); }
  };

  const handler = new CommandHandler(mockBot, {}, { error: () => {}, debug: () => {} }, null, null, null, null, null, null);

  // Provide ephemeral session settings so SettingsStore.load returns notifications 'all'
  handler.ephemeralSessions[10] = { settings: { notifications: 'all', language: 'en' } };

  mockBot.messages = [];
  await handler.handle({ chatId: 10, message: { text: 'I read about Mercury today.', from: { id: 123, username: 'tester' } } });

  assert(mockBot.messages.length >= 1, 'Expected at least one message (inline wiki suggestion)');
  const found = mockBot.messages.some(m => (m.text || '').includes('Mercury') && (m.text || '').includes('smallest planet'));
  assert(found, 'Expected inline message to include Mercury summary');

  console.log('  ✓ test/unit/inline-wiki.test.js');
}

module.exports = { run: runTests };
