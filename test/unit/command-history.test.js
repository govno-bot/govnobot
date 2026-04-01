const fs = require('fs');
const path = require('path');
const CommandHandler = require('../../src/commands/command-handler');
const pkg = require('../../package.json');
const version = pkg.version;
const HistoryStore = require('../../src/storage/history-store');

// Mock data directory for tests
const TEST_ROOT = path.resolve(__dirname, '../../data/test-cmd-history');
const TEST_DATA_DIR = path.join(TEST_ROOT, 'data');
const TEST_HISTORY_DIR = path.join(TEST_DATA_DIR, 'history');
const TEST_CHAT_ID = 123454321;

// Cleanup helper
function cleanup() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

module.exports.run = async function(runner) {
  
  // Test 1: Handle History (Empty)
  await runner.test('/history returns empty message when history is empty', async () => {
    cleanup();
    fs.mkdirSync(TEST_HISTORY_DIR, { recursive: true });

    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { 
        sentMessage = msg; 
      }
    };

    const config = { 
      data: { dir: TEST_DATA_DIR },
      ai: { availableModels: ['gpt'] },
      version: version
    };
    
    // Pass logger mock
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    // Invoke handler
    await handler.handleHistory({ chatId: TEST_CHAT_ID, args: [] });
    
    runner.assert(sentMessage !== null, 'Message should be sent');
    runner.assert(sentMessage.includes('empty'), 'Message should indicate history is empty');
    
    cleanup();
  });

  // Test 2: Handle History (List)
  await runner.test('/history lists recent conversation messages', async () => {
    cleanup();
    fs.mkdirSync(TEST_HISTORY_DIR, { recursive: true });

    // Pre-populate history
    const store = new HistoryStore(TEST_HISTORY_DIR);
    await store.addMessage(TEST_CHAT_ID, 'user', 'Hello bot');
    await store.addMessage(TEST_CHAT_ID, 'assistant', 'Hello user');
    
    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { 
        sentMessage = msg; 
      }
    };

    const config = { 
      data: { dir: TEST_DATA_DIR },
      ai: { availableModels: ['gpt'] },
      version: version
    };
    
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    await handler.handleHistory({ chatId: TEST_CHAT_ID, args: [] });
    
    runner.assert(sentMessage !== null, 'Message should be sent');
    // We expect the message to contain the history content
    runner.assert(sentMessage.includes('Hello bot'), 'Should show user message');
    runner.assert(sentMessage.includes('Hello user'), 'Should show assistant message');
    
    cleanup();
  });

  // Test 3: Handle History Clear
  await runner.test('/history clear clears conversation history', async () => {
    cleanup();
    fs.mkdirSync(TEST_HISTORY_DIR, { recursive: true });

    // Pre-populate history
    const store = new HistoryStore(TEST_HISTORY_DIR);
    await store.addMessage(TEST_CHAT_ID, 'user', 'To be deleted');
    
    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { 
        sentMessage = msg; 
      }
    };

    const config = { 
      data: { dir: TEST_DATA_DIR },
      ai: { availableModels: ['gpt'] },
      version: version
    };
    
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    // Execute clear command
    await handler.handleHistory({ chatId: TEST_CHAT_ID, args: ['clear'] });
    
    runner.assert(sentMessage !== null, 'Confirmation message should be sent');
    runner.assert(sentMessage.includes('cleared') || sentMessage.includes('deleted'), 'Should confirm history cleared');
    
    // Verify file is empty or deleted
    const history = await store.loadHistory(TEST_CHAT_ID);
    runner.assertDeepEqual(history, [], 'History should be empty after clear');
    
    cleanup();
  });

  // Test 4: Handle History Invalid Subcommand
  await runner.test('/history invalid returns usage error', async () => {
    cleanup();
    fs.mkdirSync(TEST_HISTORY_DIR, { recursive: true });

    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { 
        sentMessage = msg; 
      }
    };

    const config = { data: { dir: TEST_DATA_DIR } };
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    await handler.handleHistory({ chatId: TEST_CHAT_ID, args: ['invalid'] });
    
    runner.assert(sentMessage && sentMessage.includes('Usage'), 'Should show usage info');
    
    cleanup();
  });

  // Test 4: Ask saves to history
  await runner.test('/ask saves user question and AI response to history', async () => {
    cleanup();
    fs.mkdirSync(TEST_HISTORY_DIR, { recursive: true });

    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { 
        sentMessage = msg; 
      },
      sendChatAction: async () => {}
    };

    // Mock AI chain
    const fakeChain = {
      call: async (input) => {
        return "I am a bot response";
      }
    };

    const config = { 
      data: { dir: TEST_DATA_DIR },
      ai: { availableModels: ['gpt'] },
      version: version
    };
    
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, fakeChain); // Pass fakeChain
    
    // Simulate /ask interaction
    await handler.handleAsk({ 
      chatId: TEST_CHAT_ID, 
      args: ['hello', 'world'] 
    });
    
    // Verify history file content
    const store = new HistoryStore(TEST_HISTORY_DIR);
    const history = await store.loadHistory(TEST_CHAT_ID);
    
    runner.assert(history.length === 2, 'Should have 2 messages in history');
    runner.assert(history[0].role === 'user', 'First message should be user');
    runner.assert(history[0].content === 'hello world', 'User content match');
    runner.assert(history[1].role === 'assistant', 'Second message should be assistant');
    runner.assert(history[1].content === 'I am a bot response', 'Assistant content match');
    
    cleanup();
  });
};

