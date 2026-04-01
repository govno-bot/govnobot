/**
 * Test: Logger Module (TDD - Phase 1.2)
 * Tests for structured logging with multiple levels and outputs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

async function run(runner) {
  console.log('\n📝 Testing Logger Module');
  
  // Import logger module (doesn't exist yet - TDD!)
  let Logger;
  try {
    Logger = require('../../src/utils/logger');
  } catch (error) {
    runner.assert(false, 'Logger module should exist at src/utils/logger.js');
    return;
  }
  
  // Test 1: Logger instance creation
  {
    const logger = new Logger();
    runner.assert(logger instanceof Logger, 'Can create Logger instance');
  }
  
  // Test 2: Log levels exist
  {
    const logger = new Logger();
    runner.assert(typeof logger.debug === 'function', 'Has debug() method');
    runner.assert(typeof logger.info === 'function', 'Has info() method');
    runner.assert(typeof logger.warn === 'function', 'Has warn() method');
    runner.assert(typeof logger.error === 'function', 'Has error() method');
  }
  
  // Test 3: Console output (check doesn't crash)
  {
    const logger = new Logger({ console: true, file: false });
    logger.info('Test message');
    runner.assert(true, 'Can log to console');
  }
  
  // Test 4: File output
  {
    const tempFile = path.join('./', `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false, 
      file: true,
      filePath: tempFile 
    });
    
    logger.info('Test file output');
    logger.close();
    
    runner.assert(fs.existsSync(tempFile), 'Log file created');
    
    const content = fs.readFileSync(tempFile, 'utf8');
    runner.assert(content.includes('Test file output'), 'Message written to file');
    
    // Cleanup
    fs.unlinkSync(tempFile);
  }
  
  // Test 5: Log level filtering
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile,
      level: 'warn' // Only warn and error
    });
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    logger.close();
    
    const content = fs.readFileSync(tempFile, 'utf8');
    runner.assert(!content.includes('Debug message'), 'Debug filtered out');
    runner.assert(!content.includes('Info message'), 'Info filtered out');
    runner.assert(content.includes('Warning message'), 'Warn logged');
    runner.assert(content.includes('Error message'), 'Error logged');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 6: Timestamp formatting
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile 
    });
    
    logger.info('Timestamped message');
    logger.close();
    
    const content = fs.readFileSync(tempFile, 'utf8');
    // Check for ISO timestamp format
    runner.assert(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(content), 'Has ISO timestamp');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 7: Structured logging (JSON)
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile,
      format: 'json'
    });
    
    logger.info('Test', { userId: 123, action: 'test' });
    logger.close();
    
    const content = fs.readFileSync(tempFile, 'utf8');
    const lines = content.trim().split('\n');
    const parsed = JSON.parse(lines[0]);
    
    runner.assertEqual(parsed.level, 'info', 'JSON has level');
    runner.assertEqual(parsed.message, 'Test', 'JSON has message');
    runner.assert(parsed.timestamp, 'JSON has timestamp');
    runner.assertEqual(parsed.userId, 123, 'JSON has metadata');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 8: Error stack traces
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile 
    });
    
    const error = new Error('Test error');
    logger.error('Error occurred', error);
    logger.close();
    
    const content = fs.readFileSync(tempFile, 'utf8');
    runner.assert(content.includes('Test error'), 'Error message logged');
    runner.assert(content.includes('at '), 'Stack trace logged');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 9: Log rotation check (file exists)
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile 
    });
    
    // Write many lines
    for (let i = 0; i < 100; i++) {
      logger.info(`Message ${i}`);
    }
    logger.close();
    
    runner.assert(fs.existsSync(tempFile), 'Log file exists after many writes');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 10: Concurrent logging (no corruption)
  {
    const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
    const logger1 = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile 
    });
    const logger2 = new Logger({ 
      console: false,
      file: true,
      filePath: tempFile 
    });
    
    logger1.info('Logger 1');
    logger2.info('Logger 2');
    logger1.close();
    logger2.close();
    
    const content = fs.readFileSync(tempFile, 'utf8');
    runner.assert(content.includes('Logger 1'), 'Logger 1 wrote');
    runner.assert(content.includes('Logger 2'), 'Logger 2 wrote');
    
    fs.unlinkSync(tempFile);
  }
  
  // Test 11: Default configuration
  {
    const logger = new Logger();
    runner.assert(logger.level !== undefined, 'Has default level');
    runner.assert(logger.console !== undefined, 'Has default console setting');
  }
  
  // Test 12: Close method
  {
    const logger = new Logger({ console: false, file: false });
    logger.close();
    runner.assert(true, 'Can close logger without errors');
  }
}

module.exports = { run };
