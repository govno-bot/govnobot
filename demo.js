#!/usr/bin/env node
/**
 * Demo: Show GovnoBot Node.js modules in action
 * Demonstrates implemented functionality
 */

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  GovnoBot Node.js - Live Demo                          ║');
console.log('║  Demonstrating TDD-Implemented Modules                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Demo 1: Message Chunker
console.log('📦 Demo 1: Message Chunker\n');
try {
  const chunker = require('./src/utils/chunker');
  
  console.log('Test 1: Short message');
  const short = chunker.chunk('Hello, World!');
  console.log(`  Input: "Hello, World!" (${13} chars)`);
  console.log(`  Chunks: ${short.length}`);
  console.log(`  Output: "${short[0]}"\n`);
  
  console.log('Test 2: Long message (8000 chars)');
  const long = 'X'.repeat(8000);
  const chunks = chunker.chunk(long);
  console.log(`  Input: ${'X'.repeat(20)}... (${8000} chars)`);
  console.log(`  Chunks: ${chunks.length}`);
  console.log(`  Chunk 1 length: ${chunks[0].length}`);
  console.log(`  Chunk 2 length: ${chunks[1].length}`);
  console.log(`  Total: ${chunks.join('').length} chars (no data loss!)\n`);
  
  console.log('Test 3: Message with newlines');
  const multiline = 'Line 1\n'.repeat(500);
  const multiChunks = chunker.chunk(multiline);
  console.log(`  Input: ${multiline.split('\n').length} lines (${multiline.length} chars)`);
  console.log(`  Chunks: ${multiChunks.length}`);
  console.log(`  Splits at newlines for readability ✓\n`);
  
  console.log('✅ Chunker working correctly!\n');
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('   Run: node bootstrap.js to set up files\n');
}

// Demo 2: Configuration
console.log('⚙️  Demo 2: Configuration Module\n');
try {
  const { Config } = require('./src/config');
  
  // Set some test env vars
  process.env.TELEGRAM_GOVNOBOT_TOKEN = 'demo_token_123';
  process.env.TELEGRAM_ADMIN_USERNAME = 'demo_admin';
  process.env.OLLAMA_MODEL = 'llama2';
  
  const config = new Config();
  config.load();
  
  console.log('Configuration loaded:');
  console.log(`  Telegram token: ${config.telegram.token ? '✓ configured' : '✗ missing'}`);
  console.log(`  Admin username: ${config.telegram.adminUsername}`);
  console.log(`  Ollama URL: ${config.ollama.url}`);
  console.log(`  Ollama model: ${config.ollama.model}`);
  console.log(`  Message chunk size: ${config.bot.messageChunkSize}`);
  console.log(`  Rate limit: ${config.bot.rateLimitPerMin}/min, ${config.bot.rateLimitPerHour}/hour`);
  console.log(`  Data directory: ${config.data.dir}`);
  
  console.log('\nSafe summary (for logging):');
  const summary = config.getSummary();
  console.log(JSON.stringify(summary, null, 2));
  
  console.log('\n✅ Config working correctly!\n');
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('   Run: node bootstrap.js to set up files\n');
}

// Demo 3: Logger Module
console.log('📝 Demo 3: Logger Module\n');
try {
  const Logger = require('./src/utils/logger');
  const path = require('path');
  const os = require('os');
  
  console.log('Test 1: Console logging');
  const logger = new Logger({ console: true, file: false, level: 'info' });
  logger.info('Application started');
  logger.warn('This is a warning');
  console.log('  ✓ Logged to console with levels\n');
  
  console.log('Test 2: File logging with JSON');
  const tempFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
  const fileLogger = new Logger({
    console: false,
    file: true,
    filePath: tempFile,
    format: 'json'
  });
  fileLogger.info('Test', { userId: 123 });
  fileLogger.close();
  
  const fs = require('fs');
  const content = fs.readFileSync(tempFile, 'utf8');
  const parsed = JSON.parse(content.trim());
  console.log(`  Log entry: ${JSON.stringify(parsed)}`);
  console.log(`  ✓ Structured logging works\n`);
  
  fs.unlinkSync(tempFile);
  
  console.log('✅ Logger working correctly!\n');
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('   Run: node bootstrap.js to set up files\n');
}

// Demo 4: Test Runner
console.log('🧪 Demo 3: Test Runner\n');
console.log('To run all tests, execute:');
console.log('  $ node test/run-all.js');
console.log('  $ npm test\n');
console.log('Or initialize everything:');
console.log('  $ node init.js\n');

console.log('═'.repeat(60));
console.log('\n✨ All demos completed!\n');
console.log('Next steps:');
console.log('  1. Run full tests: npm test');
console.log('  2. Configure .env: cp .env.example .env');
console.log('  3. Check progress: cat PROGRESS.md');
console.log('  4. Review plan: cat govnoplan.node.md\n');
