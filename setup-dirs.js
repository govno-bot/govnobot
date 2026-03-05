const fs = require('fs');
const path = require('path');

const dirs = [
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

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${dir}`);
});

console.log('\nAll directories created successfully!');
