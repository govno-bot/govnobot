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
  
  try {
    const testModule = require(absolutePath);
    
    // Check if run function exists
    if (typeof testModule.run === 'function') {
      await testModule.run(runner);
    } else if (testModule.default && typeof testModule.default.run === 'function') {
       await testModule.default.run(runner);
    } else {
        console.error(`Test file ${testFilePath} does not export a 'run' function`);
        process.exit(1);
    }

    // Check if any assertions failed
    if (runner.stats.failed > 0) {
      process.exit(1);
    }
    
    process.exit(0);

  } catch (error) {
    console.error(`Error running test file ${testFilePath}:`, error);
    process.exit(1);
  }
})();
