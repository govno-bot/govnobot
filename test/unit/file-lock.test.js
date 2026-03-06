const fs = require('fs');
const path = require('path');
const {
  withFileLock,
  readFileLocked,
  writeFileLocked,
  appendFileLocked,
  deleteFileLocked,
} = require('../../src/storage/file-lock');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(runner) {
  console.log('\n🔒 Testing File Lock');

  const baseDir = path.join(__dirname, '..', '..', 'data', 'locks-test');
  const filePath = path.join(baseDir, 'sample.txt');
  const lockPath = filePath + '.lock';

  fs.rmSync(baseDir, { recursive: true, force: true });
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('  Running: withFileLock acquires and releases lock');
  // Test 1: withFileLock acquires and releases lock
  {
    await withFileLock(filePath, async () => {
      runner.assert(fs.existsSync(lockPath), 'lock file created while executing');
      await writeFileLocked(filePath, 'hello');
    });
    runner.assert(!fs.existsSync(lockPath), 'lock file removed after completion');
    const data = await readFileLocked(filePath);
    runner.assertEqual(data, 'hello', 'data written while locked');
  }
  console.log('  Finished: withFileLock acquires and releases lock');

  console.log('  Running: concurrent access waits for lock');
  // Test 2: concurrent access waits for lock
  {
    const events = [];
    fs.rmSync(filePath, { force: true });

    const first = withFileLock(filePath, async () => {
      events.push('first-start');
      await sleep(150);
      events.push('first-end');
    });

    const second = withFileLock(filePath, async () => {
      events.push('second-start');
      events.push('second-end');
    });

    await Promise.all([first, second]);

    const firstEndIndex = events.indexOf('first-end');
    const secondStartIndex = events.indexOf('second-start');
    runner.assert(firstEndIndex !== -1 && secondStartIndex !== -1, 'both callbacks executed');
    runner.assert(secondStartIndex > firstEndIndex, 'second started after first released lock');
  }
  console.log('  Finished: concurrent access waits for lock');

  console.log('  Running: stale lock is removed when older than timeout');
  // Test 3: stale lock is removed when older than timeout
  {
    fs.writeFileSync(lockPath, 'stale');
    const staleTime = Date.now() - 7000;
    fs.utimesSync(lockPath, staleTime / 1000, staleTime / 1000);

    await withFileLock(filePath, async () => {
      await writeFileLocked(filePath, 'fresh');
    }, { lockTimeout: 1000, retryInterval: 10 });

    runner.assert(!fs.existsSync(lockPath), 'stale lock removed and new lock released');
    const data = await readFileLocked(filePath);
    runner.assertEqual(data, 'fresh', 'data written after stale lock removal');
  }
  console.log('  Finished: stale lock is removed when older than timeout');

  console.log('  Running: read/write/append helpers work with locks');
  // Test 4: read/write/append helpers work with locks
  {
    await writeFileLocked(filePath, 'part1');
    await appendFileLocked(filePath, '-part2');
    const data = await readFileLocked(filePath);
    runner.assertEqual(data, 'part1-part2', 'append writes additional content');

    await deleteFileLocked(filePath);
    runner.assert(!fs.existsSync(filePath), 'file removed via deleteFileLocked');
  }
  console.log('  Finished: read/write/append helpers work with locks');
}

module.exports = { run };
