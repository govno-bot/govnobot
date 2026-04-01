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
    await runner.test('/ask streams partial responses token-by-token', async () => {
      cleanup();
      let sentMessages = [];
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
        sendChatAction: async () => {}
      };
      // Simulate streaming: call onToken for each char
      const fakeChain = {
        call: async (input, opts) => {
          if (opts && typeof opts.onToken === 'function') {
            for (const c of 'streamed') {
              opts.onToken(c);
            }
          }
          return 'streamed';
        }
      };
      const config = {
          dataDir: TEST_DIR,
          ai: { availableModels: ['gpt'] },
          telegram: {},
          security: {}
      };
      const handler = new (require('../../src/commands/command-handler'))(fakeClient, config, { info:()=>{}, debug:()=>{}, error:()=>{} }, {}, fakeChain);
      await handler.handleAsk({
          chatId: 123,
          args: ['stream', 'please'],
          command: 'ask'
      });
      runner.assert(sentMessages.join('').includes('streamed'), 'Should send streamed response');
      cleanup();
    });

    await runner.test('/ask aborts streaming if requested', async () => {
      cleanup();
      let sentMessages = [];
      let abortHandler;
      const fakeClient = {
        sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
        sendChatAction: async () => {}
      };
      // Simulate streaming: call onToken for each char, but abort after 3
      const fakeChain = {
        call: async (input, opts) => {
          let count = 0;
          if (opts && typeof opts.onToken === 'function' && typeof opts.isAborted === 'function') {
            for (const c of 'abcdefg') {
              if (opts.isAborted()) break;
              opts.onToken(c);
              count++;
              if (count === 3) abortHandler && abortHandler();
            }
          }
          return 'abc';
        }
      };
      const config = {
          dataDir: TEST_DIR,
          ai: { availableModels: ['gpt'] },
          telegram: {},
          security: {}
      };
      const handler = new (require('../../src/commands/command-handler'))(fakeClient, config, { info:()=>{}, debug:()=>{}, error:()=>{} }, {}, fakeChain);
      await handler.handleAsk({
          chatId: 123,
          args: ['abort', 'test'],
          command: 'ask',
          setAbortHandler: (fn) => { abortHandler = fn; }
      });
      runner.assert(sentMessages.join('').includes('abc'), 'Should send only partial response before abort');
      runner.assert(!sentMessages.join('').includes('d'), 'Should not send tokens after abort');
      cleanup();
    });
  const CommandHandler = require('../../src/commands/command-handler');

  await runner.test('/ask requests AI and returns response', async () => {
    cleanup();
    let sentMessages = [];
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessages.push(msg); },
      sendChatAction: async () => {} 
    };
    // Mock FallbackChain: accept the messages array and return answer when user content matches
    const fakeChain = {
      call: async (input) => {
        if (Array.isArray(input)) {
          const user = input.find(m => m.role === 'user');
          // Accept both direct and context-windowed prompt
          if (user && (user.content === 'What is life?' || user.content.endsWith('What is life?'))) return '42';
        }
        return 'Unknown';
      }
    };

    const config = { 
        data: { dir: TEST_DIR },
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
        data: { dir: TEST_DIR },
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
        data: { dir: TEST_DIR },
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
