#!/usr/bin/env node
/**
 * Bootstrap script to set up project structure and run initial tests
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 GovnoBot Node.js - Initial Setup\n');

// 1. Create directory structure
const directories = [
  'src/telegram',
  'src/ai',
  'src/commands/public',
  'src/commands/admin',
  'src/storage',
  'src/security',
  'src/utils',
  'test/unit',
  'test/acceptance',
  'test/features',
  'test/mocks',
  'data/history',
  'data/settings',
  'data/backups'
];

console.log('📁 Creating directory structure...');
directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ ${dir}`);
  } else {
    console.log(`  - ${dir} (exists)`);
  }
});

// 2. Move files to proper locations
console.log('\n📦 Organizing files...');

const fileMoves = [
  { from: 'test-runner.js', to: 'test/run-all.js' },
  { from: 'test-unit-chunker.test.js', to: 'test/unit/chunker.test.js' },
  { from: 'test-unit-config.test.js', to: 'test/unit/config.test.js' },
  { from: 'test-unit-logger.test.js', to: 'test/unit/logger.test.js' },
  { from: 'src-utils-chunker.js', to: 'src/utils/chunker.js' },
  { from: 'src-utils-logger.js', to: 'src/utils/logger.js' },
  { from: 'src-config.js', to: 'src/config.js' }
];

let movedCount = 0;
fileMoves.forEach(({ from, to }) => {
  const fromPath = path.join(__dirname, from);
  const toPath = path.join(__dirname, to);
  
  if (fs.existsSync(fromPath)) {
    // Ensure target directory exists
    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      fs.mkdirSync(toDir, { recursive: true });
    }
    
    // Move file
    const content = fs.readFileSync(fromPath, 'utf8');
    fs.writeFileSync(toPath, content);
    fs.unlinkSync(fromPath);
    console.log(`  ✓ ${from} → ${to}`);
    movedCount++;
  } else if (fs.existsSync(toPath)) {
    console.log(`  - ${to} (already in place)`);
  }
});

if (movedCount === 0) {
  console.log('  - All files already organized');
}

// 3. Create .gitignore if it doesn't exist
const gitignorePath = path.join(__dirname, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  const gitignoreContent = `# Node.js
node_modules/
*.log
npm-debug.log*

# Environment
.env

# Data (runtime generated)
data/history/*.json
data/settings/*.json
data/backups/*.tar.gz
data/*.log

# Keep directory structure
!data/history/.gitkeep
!data/settings/.gitkeep
!data/backups/.gitkeep

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary
*.tmp
setup-dirs.js
setup.bat
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('  ✓ Created .gitignore');
}

// 4. Create empty .gitkeep files
[
  'data/history/.gitkeep',
  'data/settings/.gitkeep',
  'data/backups/.gitkeep'
].forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
});

console.log('\n✅ Setup complete!\n');
console.log('📝 Next steps:');
console.log('  1. Copy .env.example to .env and configure');
console.log('  2. Run tests: node test/run-all.js');
console.log('  3. Start development: npm test');
console.log('');
