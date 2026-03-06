const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { handler } = require('../../src/commands/admin/command-logs');

module.exports.run = async function(runner) {
  let mockTelegramClient;
  let mockLogger;
  let sentMessages;

  const setup = () => {
    sentMessages = [];
    mockTelegramClient = {
      sendMessage: async (chatId, text, options) => {
        sentMessages.push({ chatId, text, options });
      }
    };

    mockLogger = {
      filePath: path.join(__dirname, 'test-logs.log'),
      error: () => {},
    };
  };

  const teardown = () => {
    if (fs.existsSync(mockLogger.filePath)) {
      fs.unlinkSync(mockLogger.filePath);
    }
  };

  runner.test('command-logs: should return error if logs file is not configured', async () => {
    setup();
    mockLogger.filePath = null;

    await handler({
      chatId: 123,
      args: [],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('not configured or available'));
    teardown();
  });

  runner.test('command-logs: should return error if logs file does not exist', async () => {
    setup();
    await handler({
      chatId: 123,
      args: [],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    assert.ok(sentMessages[0].text.includes('does not exist'));
    teardown();
  });

  runner.test('command-logs: should return logs if log file exists', async () => {
    setup();
    fs.writeFileSync(mockLogger.filePath, 'Line 1\nLine 2\nLine 3\n');

    await handler({
      chatId: 123,
      args: [],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    const sentText = sentMessages[0].text;
    assert.ok(sentText.includes('Line 1'));
    assert.ok(sentText.includes('Line 2'));
    assert.ok(sentText.includes('Line 3'));
    assert.ok(sentText.includes('<pre><code>'));
    teardown();
  });

  runner.test('command-logs: should apply custom line count if provided in args', async () => {
    setup();
    let content = '';
    for (let i = 1; i <= 100; i++) {
        content += `Line ${i}\n`;
    }
    fs.writeFileSync(mockLogger.filePath, content);

    await handler({
      chatId: 123,
      args: ['5'],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    const sentText = sentMessages[0].text;
    assert.ok(!sentText.includes('Line 95\n'));
    assert.ok(sentText.includes('Line 96'));
    assert.ok(sentText.includes('Line 100'));
    teardown();
  });

  runner.test('command-logs: should handle HTML escaping', async () => {
    setup();
    fs.writeFileSync(mockLogger.filePath, 'Error: <script>alert("test")</script> & extra');

    await handler({
      chatId: 123,
      args: [],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    const sentText = sentMessages[0].text;
    assert.ok(sentText.includes('&lt;script&gt;alert("test")&lt;/script&gt; &amp; extra'));
    teardown();
  });
  
  runner.test('command-logs: should truncate logs if they are too long', async () => {
    setup();
    const longString = 'A'.repeat(5000) + '\n';
    fs.writeFileSync(mockLogger.filePath, longString);

    await handler({
      chatId: 123,
      args: [],
      telegramApiClient: mockTelegramClient,
      logger: mockLogger
    });

    assert.strictEqual(sentMessages.length, 1);
    const sentText = sentMessages[0].text;
    assert.ok(sentText.includes('... [truncated] ...'));
    assert.ok(sentText.length < 4096); 
    teardown();
  });
};