// test/unit/macro-regression.test.js
// Automated regression tests for all user-defined macros
const assert = require('assert');
const MacroStore = require('../../src/storage/macro-store');
const CommandHandler = require('../../src/commands/command-handler');
const path = require('path');
const fs = require('fs');

describe('Macro Regression Suite', function() {
  const testUserId = 'regression-user';
  const macroFile = path.join(__dirname, '../../data/macros/user-regression-user.json');
  let sentMessages = [];
  const fakeClient = {
    sendMessage: async (chatId, text) => sentMessages.push({ chatId, text }),
    sendChatAction: async () => {},
    getFile: async () => ({}),
    downloadFile: async () => Buffer.from(''),
  };
  const config = { telegram: {}, ai: { defaultModel: 'test' }, dataDir: path.join(__dirname, '../../data') };
  const logger = { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} };
  const rateLimiter = { isAllowed:()=>true };
  const fallbackChain = { call: async()=>{}, transcribeAudio: async()=>'' };

  afterEach(async function() {
    sentMessages = [];
    if (fs.existsSync(macroFile)) fs.unlinkSync(macroFile);
  });

  it('should add, expand, and execute a macro without error', async function() {
    await MacroStore.addMacro(testUserId, 'regression', '/help', 'user');
    const handler = new CommandHandler(fakeClient, config, logger, rateLimiter, fallbackChain);
    await handler.handle({ message: { text: '/regression', chat: { id: 1 }, from: { id: testUserId, username: 'regression' } } });
    assert(sentMessages.some(m => m.text && m.text.toLowerCase().includes('command')));
  });

  it('should handle argument substitution in regression macro', async function() {
    await MacroStore.addMacro(testUserId, 'regargs', '/ask $1 $2', 'user');
    const handler = new CommandHandler(fakeClient, config, logger, rateLimiter, fallbackChain);
    await handler.handle({ message: { text: '/regargs foo bar', chat: { id: 1 }, from: { id: testUserId, username: 'regression' } } });
    // Should call /ask with args 'foo bar' (simulate by checking /ask usage error)
    assert(sentMessages.some(m => m.text && m.text.toLowerCase().includes('usage: /ask')));
  });
});
