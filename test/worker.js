const path = require('path');
const TestRunner = require('./run-all.js'); // Assuming worker.js is in same dir as run-all.js

(async () => {
  // Get absolute path to the test file from arguments
  const testFilePath = process.argv[2];
  if (!testFilePath) {
    console.error('No test file specified');
    process.exit(1);
  }

  // Resolve absolute path to pass to require
  const absolutePath = path.resolve(testFilePath);

  // Create a new runner instance for this process
  const runner = new TestRunner();

  // Sanitize environment to make tests deterministic regardless of the
  // developer machine's environment variables. Tests set what they need;
  // removing these keys prevents global env leakage from breaking assertions.
  const sanitizeKeys = [
    'TELEGRAM_GOVNOBOT_TOKEN', 'TELEGRAM_GOVNOBOT_ADMIN_USERNAME', 'TELEGRAM_GOVNOBOT_ADMIN_CHATID',
    'TELEGRAM_ADMIN_USERNAME', 'TELEGRAM_ADMIN_CHATID',
    'OLLAMA_URL', 'OLLAMA_MODEL', 'OPENAI_API_KEY',
    'BOT_MESSAGE_CHUNK_SIZE', 'BOT_RATE_LIMIT_REQUESTS_PER_MIN', 'BOT_RATE_LIMIT_REQUESTS_PER_HOUR',
    'BOT_DATA_DIR', 'BOT_BACKUP_RETENTION', 'BOT_LOG_LEVEL', 'BOT_LOG_FILE',
    'AVAILABLE_MODELS', 'AI_FALLBACK_ORDER', 'ADMIN_IP_WHITELIST', 'SH_COMMAND_WHITELIST',
    'AUDIT_LOG_FILE', 'AUDIT_LOG_SECRET'
  ];

  for (const k of sanitizeKeys) {
    if (process.env[k]) delete process.env[k];
  }

  // Debug: show whether key remains after sanitization (helps diagnose env leakage)
  // (This log will appear in test output; remove if not needed later.)
  console.log('test-runner: sanitized TELEGRAM_GOVNOBOT_TOKEN =', !!process.env.TELEGRAM_GOVNOBOT_TOKEN);

  // Provide minimal Mocha-like globals so legacy mocha-style tests (describe/it)
  // can run under our lightweight runner. This keeps compatibility without
  // depending on the real Mocha library.
  const beforeEachHooks = [];
  const afterEachHooks = [];
  let registeredTests = 0;

  global.describe = function(name, fn) {
    // Provide a minimal `this` context with timeout/slow stubs that some mocha
    // tests expect to call inside their describe blocks.
    const ctx = {
      timeout: function() {},
      slow: function() {}
    };
    try { fn && fn.call(ctx); } catch (e) { console.error('Error in describe:', e); }
  };

  global.it = function(name, fn) {
    registeredTests++;
    // Wrap the test function and pass to our runner
    runner.test(name, async () => {
      for (const b of beforeEachHooks) {
        await b();
      }
      await fn();
      for (const a of afterEachHooks) {
        await a();
      }
    });
  };

  // Aliases to match mocha globals
  global.test = global.it;
  global.before = function(fn) { beforeEachHooks.push(fn); };
  global.after = function(fn) { afterEachHooks.push(fn); };

  global.beforeEach = function(fn) { beforeEachHooks.push(fn); };
  global.afterEach = function(fn) { afterEachHooks.push(fn); };

  // If there's a .env file in the project root, temporarily move it
  // aside so tests run in a deterministic environment and do not pick
  // up developer secrets from disk. We'll restore it before exiting.
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', '.env');
  const envBackupPath = path.join(__dirname, '..', '.env.worker.bak');
  let envWasBackedUp = false;

  try {
    if (fs.existsSync(envPath)) {
      try {
        fs.renameSync(envPath, envBackupPath);
        envWasBackedUp = true;
      } catch (err) {
        // If we cannot move .env, proceed but warn.
        console.warn('Warning: could not move .env file for tests:', err.message);
      }
    }

    let exitCode = 0;
    try {
      const testModule = require(absolutePath);

      // If module exports a run function (our runner style), call it.
      if (typeof testModule.run === 'function') {
        await testModule.run(runner);
      } else if (testModule.default && typeof testModule.default.run === 'function') {
        await testModule.default.run(runner);
      } else {
        // If the test file used describe/it it will have registered tests via globals above.
        if (registeredTests === 0) {
          console.error(`Test file ${testFilePath} does not export a 'run' function and no tests were registered via describe/it`);
          exitCode = 1;
        }
      }

      // Exit non-zero if any assertions failed
      if (runner.stats.failed > 0) {
        exitCode = 1;
      }
    } catch (error) {
      console.error(`Error running test file ${testFilePath}:`, error);
      exitCode = 1;
    }

    // Restore .env if we moved it
    if (envWasBackedUp) {
      try {
        fs.renameSync(envBackupPath, envPath);
      } catch (err) {
        console.warn('Warning: could not restore .env file after tests:', err.message);
      }
    }

    process.exit(exitCode);
  } finally {
    // In the unlikely event we reach here without exiting, attempt restore.
    if (envWasBackedUp) {
      try {
        if (fs.existsSync(envBackupPath)) fs.renameSync(envBackupPath, envPath);
      } catch (err) {
        // ignore
      }
    }
  }
})();
