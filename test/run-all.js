#!/usr/bin/env node
/**
 * Simple Test Runner (No External Dependencies)
 * Runs all tests in test/unit, test/acceptance directories
 */

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

// Ensure directories exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create necessary directories
const dirs = [
  'test/unit',
  'test/acceptance',
  'test/features',
  'test/mocks'
];

dirs.forEach(dir => {
  ensureDirExists(path.join(__dirname, '..', dir));
});

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class TestRunner {
  constructor() {
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now()
    };
    this.failures = [];
  }

  /**
   * Find all test files recursively
   */
  findTestFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'mocks' && item !== 'fixtures') {
        files.push(...this.findTestFiles(fullPath));
      } else if (stat.isFile() && item.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Run a single test file
   */
  runTestFile(filePath) {
    return new Promise((resolve) => {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`\n${colors.cyan}Running:${colors.reset} ${relativePath}`);
      // Fork a new process for each test file via worker
      const workerPath = path.join(__dirname, 'worker.js');
      const child = fork(workerPath, [filePath], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      });
      let failed = false;
      child.on('message', (msg) => {
        // Optionally handle custom messages from test files
      });
      child.on('exit', (code) => {
        this.stats.total++;
        if (code === 0) {
          this.stats.passed++;
          console.log(`  ${colors.green}✓${colors.reset} ${relativePath}`);
        } else {
          this.stats.failed++;
          this.recordFailure(relativePath, 'Test file execution failed', new Error('Test process exited with code ' + code));
          console.log(`  ${colors.red}✗${colors.reset} ${relativePath}`);
        }
        resolve();
      });
      child.on('error', (err) => {
        this.stats.failed++;
        this.recordFailure(relativePath, 'Test file process error', err);
        console.log(`  ${colors.red}✗${colors.reset} ${relativePath} (process error)`);
        resolve();
      });
    });
  }

  /**
   * Run a named test case
   */
  async test(name, fn) {
    console.log(`  Running: ${name}`);
    try {
      await fn();
      // If we get here without error, checking stats might be needed if fn used assertions
    } catch (error) {
      this.stats.failed++;
      this.recordFailure(name, error.message, error);
      console.log(`  ${colors.red}✗${colors.reset} ${name} failed: ${error.message}`);
    }
  }

  /**
   * Test assertion - basic
   */
  assert(condition, message = 'Assertion failed') {
    this.stats.total++;
    
    if (condition) {
      this.stats.passed++;
      console.log(`  ${colors.green}✓${colors.reset} ${message}`);
    } else {
      this.stats.failed++;
      this.recordFailure('Assertion', message, new Error(message));
      console.log(`  ${colors.red}✗${colors.reset} ${message}`);
    }
  }

  /**
   * Test assertion - equality
   */
  assertEqual(actual, expected, message) {
    const passed = actual === expected;
    const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    
    this.assert(passed, msg);
    
    if (!passed) {
      console.log(`    ${colors.gray}Expected:${colors.reset} ${JSON.stringify(expected)}`);
      console.log(`    ${colors.gray}Actual:${colors.reset} ${JSON.stringify(actual)}`);
    }
  }

  /**
   * Test assertion - deep equality
   */
  assertDeepEqual(actual, expected, message) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    const msg = message || `Deep equality failed`;
    
    this.assert(passed, msg);
    
    if (!passed) {
      console.log(`    ${colors.gray}Expected:${colors.reset} ${JSON.stringify(expected, null, 2)}`);
      console.log(`    ${colors.gray}Actual:${colors.reset} ${JSON.stringify(actual, null, 2)}`);
    }
  }

  /**
   * Test assertion - throws error
   */
  async assertThrows(fn, expectedError, message) {
    this.stats.total++;
    
    try {
      await fn();
      this.stats.failed++;
      const msg = message || 'Expected function to throw';
      console.log(`  ${colors.red}✗${colors.reset} ${msg}`);
      this.recordFailure('assertThrows', msg, new Error('Function did not throw'));
    } catch (error) {
      if (expectedError && !(error instanceof expectedError)) {
        this.stats.failed++;
        const msg = message || `Expected ${expectedError.name}, got ${error.constructor.name}`;
        console.log(`  ${colors.red}✗${colors.reset} ${msg}`);
        this.recordFailure('assertThrows', msg, error);
      } else {
        this.stats.passed++;
        const msg = message || `Throws ${error.constructor.name}`;
        console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
      }
    }
  }

  /**
   * Record a test failure
   */
  recordFailure(context, message, error) {
    this.failures.push({
      context,
      message,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Print test summary
   */
  printSummary() {
    const duration = Date.now() - this.stats.startTime;
    const { total, passed, failed, skipped } = this.stats;
    
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}Test Summary${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`Total:   ${total}`);
    console.log(`${colors.green}Passed:  ${passed}${colors.reset}`);
    
    if (failed > 0) {
      console.log(`${colors.red}Failed:  ${failed}${colors.reset}`);
    } else {
      console.log(`Failed:  ${failed}`);
    }
    if (skipped > 0) {
      console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);
    }
    console.log(`Duration: ${duration}ms`);
    console.log('='.repeat(60));
    // Print failures if any
    if (this.failures.length > 0) {
      console.log(`\n${colors.red}Failures:${colors.reset}`);
      this.failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${colors.red}${failure.context}${colors.reset}: ${failure.message}`);
        if (failure.stack) {
          console.log(colors.gray + failure.stack + colors.reset);
        }
      });
    }
    // Exit code
    if (failed > 0) {
      console.log(`\n${colors.red}✗ Tests failed${colors.reset}`);
      process.exit(1);
    } else if (total === 0) {
      console.log(`\n${colors.yellow}⚠ No tests found${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}✓ All tests passed${colors.reset}`);
      process.exit(0);
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log(`${colors.cyan}GovnoBot Test Runner${colors.reset}`);
    console.log('='.repeat(60));
    
    const testDirs = [
      path.join(__dirname, '..', 'test', 'unit'),
      path.join(__dirname, '..', 'test', 'acceptance')
    ];
    
    let allTestFiles = [];
    
    // Check if arguments were provided
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // If arguments provided, filter files based on arguments
      // Arguments can be full paths or partial filenames
      for (const dir of testDirs) {
        const files = this.findTestFiles(dir);
        allTestFiles = allTestFiles.concat(files);
      }
      
      allTestFiles = allTestFiles.filter(file => {
        return args.some(arg => file.includes(arg));
      });
      
      console.log(`Filtering tests matching: ${args.join(', ')}`);
    } else {
      // No arguments, run all tests
      for (const dir of testDirs) {
        const files = this.findTestFiles(dir);
        allTestFiles = allTestFiles.concat(files);
      }
    }
    
    if (allTestFiles.length === 0) {
      console.log(`${colors.yellow}No test files found. Create tests in test/unit/ or test/acceptance/${colors.reset}`);
    } else {
      console.log(`Found ${allTestFiles.length} test file(s)\n`);
      
      // Run test files sequentially to avoid too many processes at once
      for (const file of allTestFiles) {
        await this.runTestFile(file);
      }
    }
    
    this.printSummary();
  }
}

// Run if executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = TestRunner;
