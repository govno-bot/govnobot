console.log('LOADING COMMAND ASK TEST');

// test/unit/command-ask.test.js
// TDD: /ask command unit tests

const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '../../data/test-ask-cmd');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true }); 
  }
}

module.exports.run = async function(runner) {
  const CommandHandler = require('../../src/commands/command-handler');

  await runner.test('/ask requests AI and returns response', async () => {
    cleanup();
    let sentMessages = [];
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
      sendChatAction: async () => {} 
    };
    
    // Mock FallbackChain
    const fakeChain = {
      call: async (input) => { 
        if (input === 'What is life?') return '42';
        return 'Unknown';
      }
    };

    const config = { 
        dataDir: TEST_DIR,
        ai: { availableModels: ['gpt'] }, 
        telegram: {}, 
        security: {} 
    };
    const handler = new CommandHandler(fakeClient, config, { info:()=>{}, debug:()=>{}, error:()=>{} }, {}, fakeChain);
    
    // Call ask
    await handler.handleAsk({ 
        chatId: 123, 
        args: ['What', 'is', 'life?'],
        command: 'ask'
    });

    runner.assert(sentMessages.length > 0, 'Should send response');
    runner.assert(sentMessages.some(m => m.includes('42')), 'Response should contain AI answer');
    cleanup();
  });

  await runner.test('/ask handles long responses by splitting', async () => {
    cleanup();
    let sentMessages = [];
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
      sendChatAction: async () => {}
    };
    
    // Mock FallbackChain returning long string
    const longResponse = 'A'.repeat(5000); // 4096 is limit
    const fakeChain = {
      call: async () => longResponse
    };

    const config = { 
        dataDir: TEST_DIR,
        ai: { availableModels: ['gpt'] }, 
        telegram: {}, 
        security: {} 
    };
    const handler = new CommandHandler(fakeClient, config, { info:()=>{}, debug:()=>{}, error:()=>{} }, {}, fakeChain);
    
    await handler.handleAsk({ 
        chatId: 123, 
        args: ['Long', 'response'],
        command: 'ask'
    });

    runner.assert(sentMessages.length >= 2, 'Should split long response into multiple messages');
    runner.assert(sentMessages.join('').includes(longResponse), 'Full response should be sent');
    cleanup();
  });

  await runner.test('/ask handles AI errors gracefully', async () => {
    cleanup();
    let sentMessages = [];
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
      sendChatAction: async () => {}
    };
    
    const fakeChain = {
      call: async () => { throw new Error('AI Down'); }
    };

    const config = { 
        dataDir: TEST_DIR,
        ai: { availableModels: ['gpt'] }, 
        telegram: {}, 
        security: {} 
    };
    const handler = new CommandHandler(fakeClient, config, { info:()=>{}, debug:()=>{}, error:()=>{} }, {}, fakeChain);
    
    await handler.handleAsk({ 
        chatId: 123, 
        args: ['Error'],
        command: 'ask'
    });

    runner.assert(sentMessages.some(m => m.includes('Sorry') || m.includes('error')), 'Should send friendly error message');
    cleanup();
  });
};
