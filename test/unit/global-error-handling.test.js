const { handleError } = require('../../src/utils/error-handler');

// Mock Logger
class MockLogger {
  constructor() {
    this.logs = [];
  }
  error(message, meta) {
    this.logs.push({ level: 'error', message, meta });
  }
  warn(message, meta) {
    this.logs.push({ level: 'warn', message, meta });
  }
}

module.exports.run = async function(runner) {
  console.log('\n🔒 Testing Global Error Handling UX Flow');

    // Scenario 1: User-Facing Safe Error Messages
    await runner.test('User-Facing Safe Error Messages', async () => {
      const logger = new MockLogger();
      const error = new Error('Database connection failed');
      const userMessage = handleError(error, { logger });
      
      runner.assertEqual(userMessage, 'An unexpected error occurred. Please try again.', 'Generic user message for unknown error');
    });

    await runner.test('Custom user message override', async () => {
      const logger = new MockLogger();
      const error = new Error('Something went wrong');
      const userMessage = handleError(error, { 
        logger, 
        userMessage: 'Custom error message' 
      });
      
      runner.assertEqual(userMessage, 'Custom error message', 'Custom user message override');
    });

    await runner.test('UserError message is safe to show', async () => {
      const logger = new MockLogger();
      class UserError extends Error {
        constructor(message) {
          super(message);
          this.name = 'UserError';
          this.isUserSafe = true;
        }
      }
      
      const error = new UserError('Invalid format. Please use /command <arg>.');
      const userMessage = handleError(error, { logger });
      
      runner.assertEqual(userMessage, 'Invalid format. Please use /command <arg>.', 'UserError message is safe to show');
    });

    // Scenario 2: Internal Logging with Redaction
    await runner.test('Internal Logging with Redaction (Stack Trace)', async () => {
      const logger = new MockLogger();
      const error = new Error('Crash!');
      handleError(error, { logger });
      
      const logEntry = logger.logs.find(l => l.level === 'error');
      runner.assert(logEntry, 'Should have logged an error');
      runner.assertEqual(logEntry.meta.message, 'Crash!', 'Error message logged');
      runner.assert(logEntry.meta.stack, 'Stack trace logged');
    });

    await runner.test('Internal Logging with Redaction (Sensitive Data)', async () => {
      const logger = new MockLogger();
      const error = new Error('API failure');
      const context = {
        userId: 123,
        apiKey: 'sk-1234567890abcdef',
        token: '12345:ABC-DefGhiJklMnoPqrStuVwxYz',
        password: 'supersecretpassword',
        nested: {
            secret: 'hidden',
            public: 'visible'
        }
      };

      handleError(error, { logger, context });

      const logEntry = logger.logs.find(l => l.level === 'error');
      runner.assert(logEntry, 'Should contain error log');
      
      const loggedContext = logEntry.meta.context;
      runner.assertEqual(loggedContext.userId, 123, 'Safe context preserved');
      runner.assertEqual(loggedContext.apiKey, '[REDACTED]', 'apiKey redacted');
      runner.assertEqual(loggedContext.token, '[REDACTED]', 'token redacted');
      runner.assertEqual(loggedContext.password, '[REDACTED]', 'password redacted');
      runner.assertEqual(loggedContext.nested.secret, '[REDACTED]', 'Nested secret redacted');
      runner.assertEqual(loggedContext.nested.public, 'visible', 'Non-sensitive nested context preserved');
    });
};
