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
        process.exit(1);
      }
    }

    // Exit non-zero if any assertions failed
    if (runner.stats.failed > 0) {
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error(`Error running test file ${testFilePath}:`, error);
    process.exit(1);
  }
})();
