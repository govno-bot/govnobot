const assert = require('assert');
const CommandHandler = require('../../src/commands/command-handler');
const pkg = require('../../package.json');
const version = pkg.version;

module.exports.run = async function(runner) {
  // Mock dependencies
  const mockClient = {
    sentMessages: [],
    actions: [],
    async sendMessage(chatId, text, options) {
      this.sentMessages.push({ chatId, text, options });
    },
    async sendChatAction(chatId, action) {
      this.actions.push({ chatId, action });
    },
    reset() {
      this.sentMessages = [];
      this.actions = [];
    }
  };

  const mockLogger = {
    logs: [],
    info(msg) { this.logs.push({ level: 'info', msg }); },
    warn(msg) { this.logs.push({ level: 'warn', msg }); },
    error(msg, err) { this.logs.push({ level: 'error', msg, err }); },
    debug(msg) { this.logs.push({ level: 'debug', msg }); },
    reset() { this.logs = []; }
  };

  const mockAuditLogger = {
    logs: [],
    log(user, action, details) {
      this.logs.push({ user, action, details });
    },
    reset() { this.logs = []; }
  };

  const config = {
    telegram: {
      adminUsername: 'adminUser',
      adminChatId: 12345
    },
    security: {
      shCommandWhitelist: ['echo', 'ls']
    },
    ai: {
      availableModels: ['gpt-4']
    },
    version: version
  };

  // Helper to create handler with mocked exec
  function createHandler() {
    mockAuditLogger.reset();
    const handler = new CommandHandler(mockClient, config, mockLogger, null, null, mockAuditLogger);
    // Mock exec
    handler.exec = (cmd, options, callback) => {
      console.log(`Mock exec called with ${cmd}`);
      if (cmd.startsWith('fail')) {
        callback(new Error('Command failed'), '', 'some stderr');
      } else if (cmd.startsWith('long')) {
        callback(null, 'a'.repeat(4000), '');
      } else {
        callback(null, `Output of ${cmd}`, '');
      }
    };
    return handler;
  }

  await runner.test('should reject /sh command from non-admin user', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    
    const update = {
      message: {
        chat: { id: 99999 },
        from: { id: 99999, username: 'regularUser' },
        text: '/sh echo test'
      }
    };

    await handler.handle(update);

    const sent = mockClient.sentMessages.find(m => m.chatId === 99999);
    assert.ok(sent, 'Should send a message');
    assert.ok(sent.text.includes('restricted'), 'Message should mention restriction');
    assert.strictEqual(handler.execCalled, undefined, 'Should not execute command');
  });

  await runner.test('should execute whitelisted /sh command from admin user', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    let executedCmd = null;
    handler.exec = (cmd, options, callback) => {
      executedCmd = cmd;
      callback(null, 'success', '');
    };
    
    const update = {
      message: {
        chat: { id: 12345 }, // admin chat id
        from: { id: 12345, username: 'adminUser' },
        text: '/sh echo test'
      }
    };

    await handler.handle(update);

    assert.strictEqual(executedCmd, 'echo test', 'Should execute the command');
    const sent = mockClient.sentMessages.find(m => m.text.includes('success'));
    assert.ok(sent, 'Should send command output');
  });

  await runner.test('should reject non-whitelisted /sh command from admin user', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    let executedCmd = null;
    handler.exec = (cmd, options, callback) => {
      executedCmd = cmd;
      callback(null, 'success', '');
    };
    
    // Config has whitelist: ['echo', 'ls']
    // Try 'rm'
    const update = {
      message: {
        chat: { id: 12345 },
        from: { id: 12345, username: 'adminUser' },
        text: '/sh rm -rf /'
      }
    };

    await handler.handle(update);

    assert.strictEqual(executedCmd, null, 'Should NOT execute the command');
    const sent = mockClient.sentMessages.find(m => m.chatId === 12345);
    assert.ok(sent.text.includes('not whitelisted'), 'Should mention whitelist');
  });

  await runner.test('should handle shell execution errors', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    
    const update = {
      message: {
        chat: { id: 12345 },
        from: { id: 12345, username: 'adminUser' },
        text: '/sh fail this' // "fail" triggers error in mock
      }
    };
    
    // Allow "fail" to be executed by temporarily mocking whitelist check or just assuming "fail" is allowed?
    // The current mock config only allows 'echo' and 'ls'.
    // We should update config for this test or use allowed command that fails.
    handler.config.security.shCommandWhitelist = ['fail'];

    await handler.handle(update);

    const sent = mockClient.sentMessages.find(m => m.chatId === 12345);
    assert.ok(sent.text.includes('Error: Command failed'), 'Should report error');
  });

  await runner.test('should truncate long output', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    handler.config.security.shCommandWhitelist = ['long'];
    
    const update = {
      message: {
        chat: { id: 12345 },
        from: { id: 12345, username: 'adminUser' },
        text: '/sh long output'
      }
    };

    await handler.handle(update);

    const sent = mockClient.sentMessages.find(m => m.chatId === 12345);
    assert.ok(sent.text.includes('truncated'), 'Should indicate truncation');
    assert.ok(sent.text.length < 4000, 'Message should be within limits');
  });

  await runner.test('should log audit entry for admin actions', async () => {
    mockClient.reset();
    mockLogger.reset();
    const handler = createHandler();
    handler.config.security.shCommandWhitelist = ['echo'];
    
    const update = {
      message: {
        chat: { id: 12345 },
        from: { id: 12345, username: 'adminUser' },
        text: '/sh echo audit'
      }
    };

    await handler.handle(update);

    // Verify audit logger was called
    const auditEntry = mockAuditLogger.logs[0];
    assert.ok(auditEntry, 'Audit logger should be called');
    assert.strictEqual(auditEntry.user.id, 12345, 'Should log correct user');
    assert.strictEqual(auditEntry.action, 'sh', 'Should log correct command');
    assert.deepStrictEqual(auditEntry.details.args, ['echo', 'audit'], 'Should log command args');
  });
};
