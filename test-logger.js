#!/usr/bin/env node
/**
 * Quick test runner for Logger module
 * Verifies Phase 1.2 Logger implementation
 */

const TestRunner = require('./test-runner');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Phase 1.2: Logger Module Test                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function runLoggerTests() {
  const runner = new TestRunner();
  
  // Run logger tests
  const testFile = path.join(__dirname, 'test-unit-logger.test.js');
  await runner.runTestFile(testFile);
  
  runner.printSummary();
}

runLoggerTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
