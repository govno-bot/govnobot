const SettingsStore = require('../../src/storage/settings-store');

module.exports.run = async function(runner) {
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should initialize with default settings if none exist');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should persist and load settings for a user');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should update a single setting and persist');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should throw if loading corrupt settings file');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should reset to defaults');
};
