// test/unit/command-status-version.test.js
const assert = require('assert');
const CommandHandler = require('../../src/commands/command-handler');

module.exports.run = async function(runner) {
  
  await runner.test('/status returns uptime, online status, version and memory usage', async () => {
    let sentMessage = null;
    let sentOptions = null;
    
    const fakeClient = {
      sendMessage: async (chatId, msg, options) => { 
        sentMessage = msg; 
        sentOptions = options; 
      },
      sendChatAction: async () => {} 
    };
    
    const config = { 
      version: '1.6.0', 
      logging: {},
      ai: { 
        defaultModel: 'test-model',
        availableModels: ['test-model']
      },
      telegram: {}
    };
    
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    // Simulate /status command
    await handler.handleStatus({ 
      chatId: 12345, 
      userId: 67890,
      command: 'status',
      args: [] 
    });
    
    assert.ok(sentMessage, 'Should verify message was sent');
    assert.ok(sentMessage.includes('Bot Status'), 'Should contain title "Bot Status"');
    assert.ok(sentMessage.includes('Version: 1.6.0'), 'Should contain correct version');
    assert.ok(sentMessage.includes('Status: 🟢 Online'), 'Should contain online status');
    assert.ok(sentMessage.includes('Uptime:'), 'Should contain uptime info');
    assert.ok(sentMessage.includes('Memory:'), 'Should contain memory info');
    assert.ok(sentMessage.includes('Default Model: test-model'), 'Should contain default model info');
    assert.ok(sentOptions && sentOptions.parse_mode === 'HTML', 'Should use HTML parse mode');
  });

  await runner.test('/version returns just the current version', async () => {
    let sentMessage = null;
    let sentOptions = null;
    
    const fakeClient = {
      sendMessage: async (chatId, msg, options) => { 
        sentMessage = msg; 
        sentOptions = options; 
      },
      sendChatAction: async () => {} 
    };
    
    const config = { 
      version: '2.0.0-beta', 
      logging: {},
      ai: { availableModels: [] },
      telegram: {}
    };
    
    const logger = { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} };
    const handler = new CommandHandler(fakeClient, config, logger, null, {});
    
    // Simulate /version command
    await handler.handleVersion({ 
      chatId: 12345, 
      userId: 67890,
      command: 'version',
      args: [] 
    });
    
    assert.ok(sentMessage, 'Should send a message');
    assert.ok(sentMessage.includes('2.0.0-beta'), 'Should contain the version string');
    assert.ok(sentOptions && sentOptions.parse_mode === 'HTML', 'Should use HTML parse mode');
  });

};
