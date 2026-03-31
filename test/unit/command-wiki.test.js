const assert = require('assert');

async function runTests() {
  console.log('LOADING COMMAND WIKI TEST');

  // Prepare mock wikipedia module BEFORE requiring command-handler
  const wikiPath = require.resolve('../../src/ai/wikipedia');
  // Provide controllable stubs
  const mockWiki = {
    fetchWikipediaSummary: async (q) => {
      if (!q) return null;
      if (q === 'Node.js') return { title: 'Node.js', extract: 'Node.js is a JavaScript runtime built on V8.', url: 'https://en.wikipedia.org/wiki/Node.js' };
      if (q === 'Mercury (planet)') return { title: 'Mercury (planet)', extract: 'Mercury is the smallest planet in the Solar System.', url: 'https://en.wikipedia.org/wiki/Mercury_(planet)' };
      if (q === 'Suggested Topic') return { title: 'Suggested Topic', extract: 'Suggested extract', url: 'https://en.wikipedia.org/wiki/Suggested_Topic' };
      return null;
    },
    fetchWikipediaSection: async (q, section) => {
      if (!q || !section) return null;
      if (q === 'Node.js' && (section === 'History' || section.toLowerCase() === 'history')) return { title: 'Node.js', sectionTitle: 'History', extract: 'Node history content', url: 'https://en.wikipedia.org/wiki/Node.js#History' };
      return null;
    },
    searchWikipedia: async (q) => {
      if (!q) return null;
      if (q === 'node') return 'Node.js';
      if (q === 'suggest') return 'Suggested Topic';
      return null;
    }
  };

  // Add disambiguation stub
  mockWiki.fetchWikipediaDisambiguation = async (q) => {
    if (!q) return [];
    if (q === 'Mercury') return [
      { title: 'Mercury (planet)', url: 'https://en.wikipedia.org/wiki/Mercury_(planet)' },
      { title: 'Mercury (element)', url: 'https://en.wikipedia.org/wiki/Mercury_(element)' },
      { title: 'Mercury (mythology)', url: 'https://en.wikipedia.org/wiki/Mercury_(mythology)' }
    ];
    return [];
  };

  // Inject mock into require cache so command-handler picks it up when loaded
  require.cache[wikiPath] = { exports: mockWiki };

  // Now require the command handler
  const CommandHandler = require('../../src/commands/command-handler');

  // Mock bot client
  const mockBot = {
    messages: [],
    async sendMessage(chatId, text, opts) {
      this.messages.push({ chatId, text, opts });
    }
  };

  // Add answerCallbackQuery stub used by handler
  mockBot.answerCallbackQuery = async (id) => { return; };

  const handler = new CommandHandler(mockBot, {}, { error: () => {} }, null, null, null, null, null);

  console.log('  Running: /wiki with no topic');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 1, args: [] });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('Usage'));

  console.log('  Running: /wiki with exact topic (Node.js)');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 2, args: ['Node.js'] });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('Node.js'));
  assert(mockBot.messages[0].text.includes('JavaScript runtime'));

  console.log('  Running: /wiki with section fragment (Node.js#History)');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 25, args: ['Node.js#History'] });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('History'));
  assert(mockBot.messages[0].text.includes('Node history content'));

  console.log('  Running: /wiki with fallback search (node -> Node.js)');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 3, args: ['node'] });
  assert.strictEqual(mockBot.messages.length, 1);
  // fallback suggests Node.js which extract contains 'JavaScript runtime'
  assert(mockBot.messages[0].text.includes('Node.js'));

  console.log('  Running: /wiki not found');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 4, args: ['nonexistenttopic12345'] });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('No Wikipedia article found'));

  console.log('  Running: /wiki disambiguation (Mercury)');
  mockBot.messages = [];
  await handler.handleWiki({ chatId: 5, args: ['Mercury'] });
  assert.strictEqual(mockBot.messages.length, 1);
  const opts = mockBot.messages[0].opts || {};
  assert(opts.reply_markup && Array.isArray(opts.reply_markup.inline_keyboard));
  // Expect three options from stub
  assert.strictEqual(opts.reply_markup.inline_keyboard.length, 3);

  console.log('  Running: wiki selection callback (Mercury (planet))');
  mockBot.messages = [];
  await handler.handleFormResponse({ callbackQuery: { id: 'cb1', data: 'wiki_select:' + encodeURIComponent('Mercury (planet)'), message: { chat: { id: 6 } } } });
  assert.strictEqual(mockBot.messages.length, 1);
  assert(mockBot.messages[0].text.includes('Mercury (planet)') || mockBot.messages[0].text.includes('Mercury is the smallest'));

  console.log('  ✓ test/unit/command-wiki.test.js');
}

module.exports = { run: runTests };

