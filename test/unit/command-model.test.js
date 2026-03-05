const assert = require('assert');
const path = require('path');
const fs = require('fs');
const CommandHandler = require('../../src/commands/command-handler');
const Config = require('../../src/config');
const SettingsStore = require('../../src/storage/settings-store');

module.exports.run = async function(runner) {
  const testUserId = 77777;
  const testDataDir = path.join(__dirname, '../../data/test-model-cmd');
  
  // Clean up function
  const cleanup = () => {
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  };

  // Ensure clean start
  cleanup();
  fs.mkdirSync(testDataDir, { recursive: true });

  const getHelpers = () => {
    const sentMessages = [];
    const client = {
      sendMessage: async (chatId, text, options) => {
        sentMessages.push({ chatId, text, options });
      },
      sendChatAction: async () => {} 
    };

    const config = new Config();
    // Override manually
    config.dataDir = testDataDir;
    config.ai = {
        availableModels: ['deepseek-r1:8b', 'mistral', 'gpt-4'],
        defaultModel: 'deepseek-r1:8b',
        ollamaUrl: 'http://localhost:11434',
        openaiApiKey: 'sk-test',
        openaiModel: 'gpt-4',
        fallbackOrder: ['ollama']
    };
    
    // Create new handler each time to simulate fresh state but same data dir
    const handler = new CommandHandler(
      client,
      config,
      { info:()=>{}, warn:()=>{}, error:()=>{}, debug:()=>{} },
      { check: () => ({ allowed: true }) },
      {}
    );
    
    return { handler, client, sentMessages };
  };

  await runner.test('/model should list available models and current selection when called without args', async () => {
    const { handler, client, sentMessages } = getHelpers();
    
    const context = {
      chatId: testUserId,
      args: [],
      message: { from: { id: testUserId }, chat: { id: testUserId } }
    };

    await handler.handleModel(context);

    if (sentMessages.length === 0) {
        throw new Error('No message sent');
    }

    const response = sentMessages[0].text;
    runner.assert(response.includes('Current model:'), 'Should show current model');
    runner.assert(response.includes('deepseek-r1:8b'), 'Should show default model');
    runner.assert(response.includes('mistral'), 'Should list mistral');
    runner.assert(response.includes('gpt-4'), 'Should list gpt-4');
  });

  await runner.test('/model <valid_model> should update model', async () => {
    const { handler, client, sentMessages } = getHelpers();
    
    const context = {
        chatId: testUserId,
        args: ['mistral'],
        message: { from: { id: testUserId }, chat: { id: testUserId } }
    };

    await handler.handleModel(context);

    if (sentMessages.length === 0) {
        throw new Error('No message sent');
    }

    const response = sentMessages[0].text;
    runner.assert(response.includes('switched to'), 'Should confirm switch');
    runner.assert(response.includes('mistral'), 'Should mention new model');

    // Verify persistence
    const store = new SettingsStore(testUserId, path.join(testDataDir, 'settings'));
    const settings = await store.load();
    runner.assert(settings.model === 'mistral', 'Settings should be persisted as mistral');
  });

  await runner.test('/model <invalid_model> should reject and list valid models', async () => {
    const { handler, client, sentMessages } = getHelpers();
    
    const context = {
        chatId: testUserId,
        args: ['invalid-model'],
        message: { from: { id: testUserId }, chat: { id: testUserId } }
    };

    await handler.handleModel(context);

     if (sentMessages.length === 0) {
        throw new Error('No message sent');
    }

    const response = sentMessages[0].text;
    runner.assert(response.includes('Invalid model'), 'Should show error');
    runner.assert(response.includes('Available models:'), 'Should list available models');
  });

  // Cleanup at end
  cleanup();
};
