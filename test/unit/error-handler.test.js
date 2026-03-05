const { handleError } = require('../../src/utils/error-handler');

async function run(runner) {
  console.log('\n🚑 Testing Error Handler');

  // Test 1: logs error with context and returns friendly message
  {
    const logs = [];
    const logger = { error: (msg, meta) => logs.push({ msg, meta }) };
    const err = new Error('boom');
    const userMsg = handleError(err, {
      logger,
      userMessage: 'Sorry, something went wrong.',
      context: { command: '/ask', user: 'alice' },
      logMessage: 'command failed'
    });

    runner.assertEqual(userMsg, 'Sorry, something went wrong.', 'returns provided user message');
    runner.assert(logs.length === 1, 'logger.error called once');
    runner.assert(logs[0].msg === 'command failed', 'log message propagated');
    runner.assert(logs[0].meta.context.command === '/ask', 'context included in log payload');
  }

  // Test 2: defaults when no logger provided
  {
    const err = new Error('kaput');
    const userMsg = handleError(err);
    runner.assert(userMsg.includes('unexpected error'), 'default user message returned');
  }

  // Test 3: handles non-Error values safely
  {
    const logs = [];
    const logger = { error: (msg, meta) => logs.push(meta) };
    const userMsg = handleError('string error', { logger });
    runner.assert(userMsg.length > 0, 'user message returned even for string input');
    runner.assert(logs[0].message.includes('string error'), 'string error captured in payload');
  }
}

module.exports = { run };
