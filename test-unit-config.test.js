/**
 * Test: Configuration Module (TDD)
 * Tests for configuration loading and validation
 */

async function run(runner) {
  console.log('\n⚙️  Testing Configuration Module');

  // Import config module
  let configModule;
  try {
    configModule = require('../../src/config');
  } catch (error) {
    runner.assert(false, 'Config module should exist at src/config.js');
    return;
  }

  const { Config } = configModule;

  // Test 1: Config instance creation
  {
    const config = new Config();
    runner.assert(config instanceof Config, 'Can create Config instance');
    runner.assert(!config.loaded, 'Config starts unloaded');
  }

  // Test 2: Loading configuration
  {
    const config = new Config();
    
    // Set test environment variables
    process.env.TEST_VAR_STRING = 'hello';
    process.env.TEST_VAR_INT = '42';
    process.env.TEST_VAR_BOOL = 'true';
    process.env.TEST_VAR_ARRAY = 'one,two,three';

    const result = config.load();
    runner.assert(result === config, 'load() returns config instance');
    runner.assert(config.loaded, 'Config marked as loaded');
  }

  // Test 3: Environment variable helpers
  {
    const config = new Config();
    process.env.TEST_STRING = 'value';
    process.env.TEST_INT = '123';
    process.env.TEST_BOOL = 'true';
    process.env.TEST_ARRAY = 'a,b,c';

    runner.assertEqual(config.env('TEST_STRING'), 'value', 'env() reads string');
    runner.assertEqual(config.envInt('TEST_INT'), 123, 'envInt() parses integer');
    runner.assertEqual(config.envBool('TEST_BOOL'), true, 'envBool() parses boolean');
    runner.assertDeepEqual(config.envArray('TEST_ARRAY'), ['a', 'b', 'c'], 'envArray() parses array');
  }

  // Test 4: Default values
  {
    const config = new Config();
    
    runner.assertEqual(config.env('NONEXISTENT', 'default'), 'default', 'env() returns default');
    runner.assertEqual(config.envInt('NONEXISTENT', 99), 99, 'envInt() returns default');
    runner.assertEqual(config.envBool('NONEXISTENT', false), false, 'envBool() returns default');
    runner.assertDeepEqual(config.envArray('NONEXISTENT', ['x']), ['x'], 'envArray() returns default');
  }

  // Test 5: Configuration structure after load
  {
    const config = new Config();
    config.load();

    runner.assert(config.telegram, 'Has telegram config');
    runner.assert(config.ollama, 'Has ollama config');
    runner.assert(config.openai, 'Has openai config');
    runner.assert(config.bot, 'Has bot config');
    runner.assert(config.data, 'Has data config');
    runner.assert(config.logging, 'Has logging config');
    runner.assert(config.security, 'Has security config');
  }

  // Test 6: Default values applied correctly
  {
    // Clear relevant env vars
    delete process.env.TELEGRAM_GOVNOBOT_TOKEN;
    delete process.env.OLLAMA_URL;
    delete process.env.OLLAMA_MODEL;

    const config = new Config();
    config.load();

    runner.assertEqual(config.ollama.url, 'http://localhost:11434', 'Ollama URL has default');
    runner.assertEqual(config.ollama.model, 'llama2', 'Ollama model has default');
    runner.assertEqual(config.bot.messageChunkSize, 4096, 'Message chunk size has default');
    runner.assert(Array.isArray(config.ollama.availableModels), 'Available models is array');
    runner.assert(config.ollama.availableModels.length > 0, 'Available models has defaults');
  }

  // Test 7: Validation - missing required fields
  {
    delete process.env.TELEGRAM_GOVNOBOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_USERNAME;
    delete process.env.TELEGRAM_ADMIN_CHATID;

    const config = new Config();
    config.load();

    let validationFailed = false;
    try {
      config.validate();
    } catch (error) {
      validationFailed = true;
      runner.assert(error.message.includes('TELEGRAM_GOVNOBOT_TOKEN'), 'Validation error mentions missing token');
    }

    runner.assert(validationFailed, 'Validation fails without required config');
  }

  // Test 8: Validation - placeholder token
  {
    process.env.TELEGRAM_GOVNOBOT_TOKEN = 'your_bot_token_here';
    process.env.TELEGRAM_ADMIN_USERNAME = 'testuser';

    const config = new Config();
    config.load();

    let validationFailed = false;
    try {
      config.validate();
    } catch (error) {
      validationFailed = true;
      runner.assert(error.message.includes('placeholder'), 'Validation rejects placeholder token');
    }

    runner.assert(validationFailed, 'Validation fails with placeholder token');
  }

  // Test 9: Validation - valid configuration
  {
    process.env.TELEGRAM_GOVNOBOT_TOKEN = 'real_token_123';
    process.env.TELEGRAM_ADMIN_USERNAME = 'admin';
    process.env.TELEGRAM_ADMIN_CHATID = '123456';

    const config = new Config();
    config.load();

    let validationPassed = false;
    try {
      const result = config.validate();
      validationPassed = result === true;
    } catch (error) {
      console.log('Unexpected validation error:', error.message);
    }

    runner.assert(validationPassed, 'Validation passes with valid config');
  }

  // Test 10: Config summary (safe logging)
  {
    process.env.TELEGRAM_GOVNOBOT_TOKEN = 'secret_token';
    process.env.OPENAI_API_KEY = 'secret_key';

    const config = new Config();
    config.load();

    const summary = config.getSummary();
    runner.assert(summary.telegram.tokenConfigured === true, 'Summary shows token configured');
    runner.assert(!JSON.stringify(summary).includes('secret_token'), 'Summary does not leak token');
    runner.assert(!JSON.stringify(summary).includes('secret_key'), 'Summary does not leak API key');
  }

  // Clean up test environment variables
  delete process.env.TEST_VAR_STRING;
  delete process.env.TEST_VAR_INT;
  delete process.env.TEST_VAR_BOOL;
  delete process.env.TEST_VAR_ARRAY;
  delete process.env.TEST_STRING;
  delete process.env.TEST_INT;
  delete process.env.TEST_BOOL;
  delete process.env.TEST_ARRAY;
}

module.exports = { run };
