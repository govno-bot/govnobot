// test/unit/command-persona.test.js
const fs = require('fs');
const path = require('path');
const personaCommand = require('../../src/commands/public/command-persona');

module.exports.run = async function(runner) {
  const TEST_DATA_DIR = path.join(__dirname, '..', '..', 'data', 'settings');
  
  // Setup test environment
  await runner.test('persona command requires args and lists available personas', async () => {
    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessage = msg; }
    };
    const context = {
      chatId: 1,
      args: [],
      telegramApiClient: fakeClient,
      config: { data: { dir: path.join(__dirname, '..', '..', 'data') } },
      logger: { error: () => {}, info: () => {} }
    };

    await personaCommand.handler(context);
    runner.assert(sentMessage !== null, 'Should send a message');
    runner.assert(sentMessage.includes('Usage: /persona &lt;name&gt;'), 'Should include usage message');
    runner.assert(sentMessage.includes('pirate, therapist, yoda'), 'Should list personas');
  });

  await runner.test('persona command rejects unknown persona', async () => {
    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessage = msg; }
    };
    const context = {
      chatId: 1,
      args: ['alien'],
      telegramApiClient: fakeClient,
      config: { data: { dir: path.join(__dirname, '..', '..', 'data') } },
      logger: { error: () => {}, info: () => {} }
    };

    await personaCommand.handler(context);
    runner.assert(sentMessage !== null, 'Should send a message');
    runner.assert(sentMessage.includes('Unknown persona: alien'), 'Should include unknown persona message');
  });

  await runner.test('persona command updates systemPrompt for valid persona', async () => {
    let sentMessage = null;
    const fakeClient = {
      sendMessage: async (chatId, msg) => { sentMessage = msg; }
    };
    const context = {
      chatId: 12345,
      args: ['pirate'],
      telegramApiClient: fakeClient,
      config: { data: { dir: path.join(__dirname, '..', '..', 'data') } },
      logger: { error: () => {}, info: () => {} }
    };

    // Ensure data/settings directory exists for test
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    await personaCommand.handler(context);
    
    runner.assert(sentMessage !== null, 'Should send a message');
    runner.assert(sentMessage.includes('Persona switched to: pirate'), 'Should send success message');
    
    // Check if file was saved correctly
    const settingsFile = path.join(TEST_DATA_DIR, '12345.json');
    runner.assert(fs.existsSync(settingsFile), 'Settings file should exist');
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    runner.assert(settings.systemPrompt.includes('pirate'), 'System prompt should be updated to pirate persona');
    
    // Clean up
    if (fs.existsSync(settingsFile)) {
      fs.unlinkSync(settingsFile);
    }
  });
};
