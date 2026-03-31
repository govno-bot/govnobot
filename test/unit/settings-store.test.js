const SettingsStore = require('../../src/storage/settings-store');

const fs = require('fs');
const path = require('path');

module.exports.run = async function(runner) {
  const tmpDir = path.join(__dirname, '../../data/test-settings');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const userId = 'testuser';
  const filePath = path.join(tmpDir, userId + '.json');
  // Clean up before
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await runner.test('should initialize with default settings if none exist', async () => {
    const store = new SettingsStore(userId, tmpDir);
    const settings = await store.load();
    runner.assert(settings.theme === 'light', 'Default theme should be light');
    runner.assert(settings.verbosity === 'normal', 'Default verbosity should be normal');
    runner.assert(settings.notifications === 'all', 'Default notifications should be all');
  });

  await runner.test('should persist and load settings for a user', async () => {
    const store = new SettingsStore(userId, tmpDir);
    await store.save({ theme: 'dark', verbosity: 'verbose', notifications: 'mentions' });
    const loaded = await store.load();
    runner.assert(loaded.theme === 'dark', 'Theme should persist as dark');
    runner.assert(loaded.verbosity === 'verbose', 'Verbosity should persist as verbose');
    runner.assert(loaded.notifications === 'mentions', 'Notifications should persist as mentions');
  });

  await runner.test('should update a single setting and persist', async () => {
    const store = new SettingsStore(userId, tmpDir);
    await store.update('theme', 'light');
    const loaded = await store.load();
    runner.assert(loaded.theme === 'light', 'Theme should update to light');
    await store.update('verbosity', 'minimal');
    const loaded2 = await store.load();
    runner.assert(loaded2.verbosity === 'minimal', 'Verbosity should update to minimal');
  });

  await runner.test('should throw if loading corrupt settings file', async () => {
    fs.writeFileSync(filePath, '{bad json', 'utf8');
    const store = new SettingsStore(userId, tmpDir);
    let threw = false;
    try {
      await store.load();
    } catch (e) {
      threw = true;
    }
    runner.assert(threw, 'Should throw on corrupt settings file');
    // Clean up
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  await runner.test('should reset to defaults', async () => {
    const store = new SettingsStore(userId, tmpDir);
    await store.save({ theme: 'dark', verbosity: 'verbose', notifications: 'mentions' });
    await store.reset();
    const settings = await store.load();
    runner.assert(settings.theme === 'light', 'Theme should reset to light');
    runner.assert(settings.verbosity === 'normal', 'Verbosity should reset to normal');
    runner.assert(settings.notifications === 'all', 'Notifications should reset to all');
  });

  // Clean up after
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};
