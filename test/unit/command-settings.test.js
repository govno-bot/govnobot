const assert = require('assert');
const path = require('path');
const fs = require('fs');
const CommandHandler = require('../../src/commands/command-handler');
const SettingsStore = require('../../src/storage/settings-store');

// Mock dependencies
const mockClient = {
  messages: [],
  async sendMessage(chatId, text, options) {
    this.messages.push({ chatId, text, options });
  },
  async sendChatAction() {},
  reset() { this.messages = []; }
};

const mockConfig = {
  ai: {
    defaultModel: 'deepseek-r1:8b',
    availableModels: ['deepseek-r1:8b', 'mistral', 'codellama']
  },
  dataDir: path.join(__dirname, '..', '..', 'temp-test-settings-cmd')
};

const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
};

// Helper to clean up test directory
const cleanup = () => {
  if (fs.existsSync(mockConfig.dataDir)) {
    fs.rmSync(mockConfig.dataDir, { recursive: true, force: true });
  }
};

module.exports.run = async function(runner) {
  const handler = new CommandHandler(
    mockClient,
    mockConfig,
    mockLogger,
    null, // rateLimiter
    null  // fallbackChain
  );
  
  // Clean start
  cleanup();
  
  // Ensure data dir exists
  fs.mkdirSync(path.join(mockConfig.dataDir, 'settings'), { recursive: true });

  const chatId = 12345;
  const store = new SettingsStore(chatId, path.join(mockConfig.dataDir, 'settings'));

  // Test 1: /settings (view) - defaults
  {
    mockClient.reset();
    await handler.handleSettings({ chatId, args: [] });
    
    assert.strictEqual(mockClient.messages.length, 1);
    const msg = mockClient.messages[0].text;
    assert.ok(msg.includes('Current Settings'), 'Should show title');
    assert.ok(msg.includes('Model: deepseek-r1:8b'), 'Should show default model');
    assert.ok(msg.includes('System Prompt: You are a helpful assistant.'), 'Should show default prompt');
  }

  // Test 2: /settings model <invalid>
  {
    mockClient.reset();
    await handler.handleSettings({ chatId, args: ['model', 'invalid_model'] });
    
    assert.strictEqual(mockClient.messages.length, 1);
    const msg = mockClient.messages[0].text;
    assert.ok(msg.includes('Invalid model'), 'Should warn about invalid model');
  }

  // Test 3: /settings model <valid>
  {
    mockClient.reset();
    await handler.handleSettings({ chatId, args: ['model', 'mistral'] });
    
    assert.strictEqual(mockClient.messages.length, 1);
    const msg = mockClient.messages[0].text;
    assert.ok(msg.includes('Settings updated'), 'Should confirm update');
    
    // Verify persistence
    const settings = await store.load();
    assert.strictEqual(settings.model, 'mistral', 'Should persist new model');
  }

  // Test 4: /settings systemPrompt <value>
  {
    mockClient.reset();
    const prompt = 'You are a pirate.';
    await handler.handleSettings({ chatId, args: ['systemPrompt', ...prompt.split(' ')] });
    
    assert.strictEqual(mockClient.messages.length, 1);
    const msg = mockClient.messages[0].text;
    assert.ok(msg.includes('Settings updated'), 'Should confirm update');
    
    const settings = await store.load();
    assert.strictEqual(settings.systemPrompt, prompt, 'Should persist new prompt');
  }

  // Test 5: /settings <invalid_key>
  {
    mockClient.reset();
    await handler.handleSettings({ chatId, args: ['foo', 'bar'] });
    
    assert.strictEqual(mockClient.messages.length, 1);
    const msg = mockClient.messages[0].text;
    assert.ok(msg.includes('Invalid setting'), 'Should warn about invalid key');
    assert.ok(msg.includes('model'), 'Should list valid keys');
    assert.ok(msg.includes('systemPrompt'), 'Should list valid keys');
  }
  
  // Check persisted state (re-verify)
  {
      mockClient.reset();
      await handler.handleSettings({ chatId, args: [] });
      const msg = mockClient.messages[0].text;
      assert.ok(msg.includes('Model: mistral'), 'Should show updated model');
      assert.ok(msg.includes('System Prompt: You are a pirate.'), 'Should show updated prompt');
  }

  // Cleanup
  cleanup();
};
