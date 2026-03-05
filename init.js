#!/usr/bin/env node
/**
 * Initialize and verify GovnoBot Node.js implementation
 * Runs bootstrap and initial tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  GovnoBot Node.js Implementation - Initialization      ║');
console.log('║  TDD/BDD/ADD Approach - Zero Dependencies             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Step 1: Run bootstrap
console.log('Step 1: Running bootstrap...');
try {
  require('./bootstrap.js');
  console.log('✅ Bootstrap completed\n');
} catch (error) {
  console.error('❌ Bootstrap failed:', error.message);
  process.exit(1);
}

// Step 2: Verify structure
console.log('Step 2: Verifying project structure...');
const requiredDirs = [
  'src/utils',
  'test/unit',
  'test/acceptance',
  'test/mocks',
  'data/history',
  'data/settings',
  'data/backups'
];

let structureOk = true;
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`  ${exists ? '✓' : '✗'} ${dir}`);
  if (!exists) structureOk = false;
});

if (!structureOk) {
  console.error('\n❌ Project structure incomplete');
  process.exit(1);
}
console.log('✅ Project structure verified\n');

// Step 3: Check required files
console.log('Step 3: Checking core files...');
const requiredFiles = [
  'test/run-all.js',
  'test/unit/chunker.test.js',
  'src/utils/chunker.js',
  'package.json',
  '.env.example'
];

let filesOk = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) filesOk = false;
});

if (!filesOk) {
  console.error('\n❌ Required files missing');
  process.exit(1);
}
console.log('✅ Core files present\n');

// Step 4: Check .env
console.log('Step 4: Checking configuration...');
const envExists = fs.existsSync(path.join(__dirname, '.env'));
if (!envExists) {
  console.log('  ⚠ .env file not found');
  console.log('  ℹ Copy .env.example to .env and configure your tokens\n');
} else {
  console.log('  ✓ .env file exists\n');
}

// Step 5: Run tests
console.log('Step 5: Running initial tests...\n');
console.log('═'.repeat(60));

try {
  const testRunner = require('./test/run-all.js');
  // Tests will run and exit
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
