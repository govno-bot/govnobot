const RateLimiter = require('../../src/security/rate-limiter');

function createLoggerSpy() {
  const calls = { debug: 0, info: 0, warn: 0 };
  return {
    calls,
    logger: {
      debug: () => { calls.debug++; },
      info: () => { calls.info++; },
      warn: () => { calls.warn++; },
    }
  };
}

async function run(runner) {
  console.log('\n⏳ Testing Rate Limiter');

  // Test 1: allows up to per-minute limit, then blocks
  {
    const { logger, calls } = createLoggerSpy();
    const rl = new RateLimiter(3, 100, logger);
    const chatId = 123;

    runner.assert(rl.isAllowed(chatId) === true, 'first request allowed');
    runner.assert(rl.isAllowed(chatId) === true, 'second request allowed');
    runner.assert(rl.isAllowed(chatId) === true, 'third request allowed');
    runner.assert(rl.isAllowed(chatId) === false, 'fourth request blocked by minute limit');
    runner.assert(calls.warn >= 1, 'warn() called when minute limit exceeded');
  }

  // Test 2: allows up to per-hour limit, then blocks
  {
    const rl = new RateLimiter(1000, 5); // high minute limit to focus on hour
    const chatId = 456;

    for (let i = 0; i < 5; i++) {
      runner.assert(rl.isAllowed(chatId) === true, `hour request ${i + 1} allowed`);
    }
    runner.assert(rl.isAllowed(chatId) === false, 'sixth request blocked by hour limit');
  }

  // Test 3: getStatus returns expected counters and remaining
  {
    const rl = new RateLimiter(3, 10);
    const chatId = 789;

    const initial = rl.getStatus(chatId);
    runner.assertEqual(initial.requestsThisMinute, 0, 'initial minute count is 0');
    runner.assertEqual(initial.requestsThisHour, 0, 'initial hour count is 0');
    runner.assertEqual(initial.remainingMinute, 3, 'initial remaining minute = limit');
    runner.assertEqual(initial.remainingHour, 10, 'initial remaining hour = limit');
    runner.assertEqual(initial.minutesUntilReset, 1, 'initial minutesUntilReset is 1');
    runner.assertEqual(initial.hoursUntilReset, 1, 'initial hoursUntilReset is 1');

    // Make two allowed requests
    rl.isAllowed(chatId);
    rl.isAllowed(chatId);

    const after = rl.getStatus(chatId);
    runner.assertEqual(after.requestsThisMinute, 2, 'minute count increments');
    runner.assertEqual(after.requestsThisHour, 2, 'hour count increments');
    runner.assertEqual(after.remainingMinute, 1, 'remaining minute decrements');
    runner.assertEqual(after.remainingHour, 8, 'remaining hour decrements');
  }

  // Test 4: reset(chatId) clears limits for that user
  {
    const rl = new RateLimiter(2, 2);
    const chatId = 321;

    runner.assert(rl.isAllowed(chatId) === true, 'first allowed before reset');
    runner.assert(rl.isAllowed(chatId) === true, 'second allowed before reset');
    runner.assert(rl.isAllowed(chatId) === false, 'third blocked before reset');

    rl.reset(chatId);
    runner.assert(rl.isAllowed(chatId) === true, 'allowed after reset');

    const status = rl.getStatus(chatId);
    runner.assert(status.requestsThisMinute >= 1, 'status reflects fresh window after reset');
  }

  // Test 5: resetAll() clears all tracked users
  {
    const rl = new RateLimiter(5, 5);
    rl.isAllowed(1);
    rl.isAllowed(2);
    rl.isAllowed(3);

    runner.assert(rl.getTrackedUsers().length >= 3, 'tracks multiple users');
    rl.resetAll();
    runner.assertEqual(rl.getTrackedUsers().length, 0, 'no tracked users after resetAll');
  }

  // Test 6: cleanup() removes users with only stale hour entries
  {
    const rl = new RateLimiter(5, 5);
    const staleId = 999;
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    // Manually seed stale timestamps
    rl.limits.set(staleId, { minute: [twoHoursAgo], hour: [twoHoursAgo] });
    runner.assertEqual(rl.getTrackedUsers().length, 1, 'stale user initially tracked');

    rl.cleanup();
    runner.assertEqual(rl.getTrackedUsers().length, 0, 'stale user removed by cleanup');
  }
}

module.exports = { run };
