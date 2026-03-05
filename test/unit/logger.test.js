const fs = require('fs');
const path = require('path');
const Logger = require('../../src/utils/logger');

function captureConsole() {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const buffer = { logs: [], warns: [], errors: [] };

  console.log = (...args) => buffer.logs.push(args.join(' '));
  console.warn = (...args) => buffer.warns.push(args.join(' '));
  console.error = (...args) => buffer.errors.push(args.join(' '));

  return {
    buffer,
    restore() {
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
    }
  };
}

async function run(runner) {
  console.log('\n🧪 Testing Logger');

  // Clean temp log directory
  const tempDir = path.join(__dirname, '..', '..', 'data', 'logs');
  const logPath = path.join(tempDir, 'logger.test.log');
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Test 1: shouldLog respects levels
  {
    const logger = new Logger('warn');
    runner.assert(!logger.shouldLog('debug'), 'debug suppressed when level=warn');
    runner.assert(logger.shouldLog('warn'), 'warn allowed when level=warn');
    runner.assert(logger.shouldLog('error'), 'error allowed when level=warn');
  }

  // Test 2: writes to file and formats meta objects
  {
    const logger = new Logger('debug', logPath);
    const capture = captureConsole();
    logger.info('hello world', { a: 1, b: 'two' });
    capture.restore();

    const content = fs.readFileSync(logPath, 'utf8');
    runner.assert(content.includes('INFO: hello world'), 'file contains info message');
    runner.assert(content.includes('"a": 1'), 'file includes meta object');
  }

  // Test 3: child logger injects context into formatted messages
  {
    const logger = new Logger('debug');
    const child = logger.child({ command: 'ask', user: 'alice' });
    const entry = child.format('info', 'processing');
    runner.assert(entry.includes('command'), 'child format includes context key');
    runner.assert(entry.includes('processing'), 'child format keeps original message');
  }

  // Test 4: error meta appends stack information
  {
    const logger = new Logger('debug');
    const error = new Error('boom');
    const entry = logger.format('error', 'failed op', error);
    runner.assert(entry.includes('Error: boom'), 'format includes error message');
    runner.assert(entry.includes('Stack:'), 'format includes stack trace');
  }

  // Test 5: level filtering prevents console/file writes
  {
    const logger = new Logger('error', logPath);
    const capture = captureConsole();
    logger.info('should not log');
    capture.restore();

    const content = fs.readFileSync(logPath, 'utf8');
    runner.assert(!content.includes('should not log'), 'info suppressed when level=error');
    runner.assert(capture.buffer.logs.length === 0, 'console.log not called for suppressed level');
  }
}

module.exports = { run };
