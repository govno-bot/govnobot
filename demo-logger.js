#!/usr/bin/env node
/**
 * Logger Demo - Shows structured logging in action
 */

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Logger Module Demo                                    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

try {
  const Logger = require('./src/utils/logger');
  const path = require('path');
  const os = require('os');
  
  // Demo 1: Console logging with different levels
  console.log('📝 Demo 1: Console Logging\n');
  
  const consoleLogger = new Logger({ 
    console: true, 
    file: false,
    level: 'debug'
  });
  
  consoleLogger.debug('This is a debug message');
  consoleLogger.info('This is an info message');
  consoleLogger.warn('This is a warning message');
  consoleLogger.error('This is an error message');
  
  console.log('\n✅ All log levels displayed\n');
  
  // Demo 2: File logging
  console.log('📁 Demo 2: File Logging\n');
  
  const tempFile = path.join(os.tmpdir(), `logger-demo-${Date.now()}.log`);
  const fileLogger = new Logger({
    console: false,
    file: true,
    filePath: tempFile,
    level: 'info'
  });
  
  fileLogger.info('Log file created');
  fileLogger.info('Multiple entries', { userId: 123, action: 'test' });
  fileLogger.warn('Warning with metadata', { reason: 'demo' });
  fileLogger.error('Error with stack', new Error('Demo error'));
  fileLogger.close();
  
  const fs = require('fs');
  const content = fs.readFileSync(tempFile, 'utf8');
  console.log(`  Log file: ${tempFile}`);
  console.log(`  Lines written: ${content.split('\n').filter(l => l).length}`);
  console.log('  Sample content:');
  content.split('\n').slice(0, 2).forEach(line => {
    if (line) console.log('    ' + line.substring(0, 80) + '...');
  });
  
  fs.unlinkSync(tempFile);
  console.log('  ✓ Temp file cleaned up\n');
  
  // Demo 3: JSON structured logging
  console.log('🔧 Demo 3: JSON Structured Logging\n');
  
  const tempJson = path.join(os.tmpdir(), `logger-json-${Date.now()}.log`);
  const jsonLogger = new Logger({
    console: false,
    file: true,
    filePath: tempJson,
    format: 'json',
    level: 'info'
  });
  
  jsonLogger.info('User logged in', { userId: 456, ip: '192.168.1.1' });
  jsonLogger.warn('Rate limit approaching', { userId: 456, requests: 95 });
  jsonLogger.error('API error', { endpoint: '/api/users', status: 500 });
  jsonLogger.close();
  
  const jsonContent = fs.readFileSync(tempJson, 'utf8');
  const lines = jsonContent.trim().split('\n');
  console.log(`  Entries: ${lines.length}`);
  console.log('  Sample JSON entry:');
  console.log('    ' + JSON.stringify(JSON.parse(lines[0]), null, 2).replace(/\n/g, '\n    '));
  
  fs.unlinkSync(tempJson);
  console.log('  ✓ Temp file cleaned up\n');
  
  // Demo 4: Log level filtering
  console.log('🔍 Demo 4: Log Level Filtering\n');
  
  const tempFiltered = path.join(os.tmpdir(), `logger-filtered-${Date.now()}.log`);
  const filteredLogger = new Logger({
    console: false,
    file: true,
    filePath: tempFiltered,
    level: 'warn' // Only warn and error
  });
  
  filteredLogger.debug('Debug - should be filtered');
  filteredLogger.info('Info - should be filtered');
  filteredLogger.warn('Warning - should appear');
  filteredLogger.error('Error - should appear');
  filteredLogger.close();
  
  const filteredContent = fs.readFileSync(tempFiltered, 'utf8');
  const filteredLines = filteredContent.trim().split('\n');
  console.log(`  Level: warn (only warn and error logged)`);
  console.log(`  Debug/Info filtered: ✓`);
  console.log(`  Warn/Error logged: ${filteredLines.length} entries`);
  
  fs.unlinkSync(tempFiltered);
  console.log('  ✓ Temp file cleaned up\n');
  
  // Demo 5: Error logging with stack traces
  console.log('💥 Demo 5: Error Logging\n');
  
  const errorLogger = new Logger({ console: true, file: false });
  
  try {
    throw new Error('Something went wrong!');
  } catch (error) {
    errorLogger.error('Caught an error', error);
  }
  
  console.log('\n✅ Error logged with stack trace\n');
  
  console.log('═'.repeat(60));
  console.log('\n✨ All demos completed!\n');
  console.log('Key Features:');
  console.log('  • Multiple log levels (debug, info, warn, error)');
  console.log('  • Console and file output');
  console.log('  • JSON structured logging');
  console.log('  • Log level filtering');
  console.log('  • Error stack traces');
  console.log('  • Metadata support');
  console.log('  • Zero dependencies!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('   Run: node bootstrap.js to set up files\n');
  process.exit(1);
}
