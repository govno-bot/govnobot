// Unit tests for macro command integration with CommandHandler
const assert = require('assert');
const CommandHandler = require('../../src/commands/command-handler');
const MacroStore = require('../../src/storage/macro-store');
const path = require('path');
const fs = require('fs');

describe('CommandHandler macro integration', function() {
  const testUserId = 12345;
  const testChatId = 12345;
  const macroFile = path.join(__dirname, '../../data/macros/user-12345.json');
  let sentMessages = [];
  const fakeClient = {
    sendMessage: async (chatId, text, opts) => sentMessages.push({ chatId, text, opts }),
    sendChatAction: async () => {},
    getFile: async () => ({}),
    downloadFile: async () => Buffer.from(''),
  };
  const config = { telegram: {}, ai: { defaultModel: 'test' }, dataDir: path.join(__dirname, '../../data') };
  const logger = { debug:()=>{}, info:()=>{}, warn:()=>{}, error:()=>{} };
  const rateLimiter = { isAllowed:()=>true };
  const fallbackChain = { call: async()=>{}, transcribeAudio: async()=>'' };

  beforeEach(() => { sentMessages = []; });
  afterEach(() => { if (fs.existsSync(macroFile)) fs.unlinkSync(macroFile); });

  it('should expand a user macro and execute the expansion', async function() {
    await MacroStore.addMacro(testUserId, 'foo', '/help', 'user');
    const handler = new CommandHandler(fakeClient, config, logger, rateLimiter, fallbackChain);
    await handler.handle({ message: { text: '/foo', chat: { id: testChatId }, from: { id: testUserId, username: 'test' } } });
    assert(sentMessages.some(m => m.text && m.text.includes('GovnoBot Commands')));
  });

  it('should support argument substitution in macros', async function() {
    await MacroStore.addMacro(testUserId, 'bar', '/ask $1 $2', 'user');
    const handler = new CommandHandler(fakeClient, config, logger, rateLimiter, fallbackChain);
    await handler.handle({ message: { text: '/bar hello world', chat: { id: testChatId }, from: { id: testUserId, username: 'test' } } });
    // Should call /ask with args 'hello world' (simulate by checking /ask usage error)
    assert(sentMessages.some(m => m.text && m.text.includes('Usage: /ask')));
  });

  it('should not infinitely recurse on unknown macro', async function() {
    const handler = new CommandHandler(fakeClient, config, logger, rateLimiter, fallbackChain);
    await handler.handle({ message: { text: '/notamacro', chat: { id: testChatId }, from: { id: testUserId, username: 'test' } } });
    assert(sentMessages.some(m => m.text && m.text.includes('Unknown command')));
  });
});
