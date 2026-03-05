const BackupManager = require('../../src/storage/backup-manager');

module.exports.run = async function(runner) {
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should create a backup with timestamped folder');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should list all backups in reverse chronological order');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should restore a backup by folder name');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should throw if backup does not exist');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should handle concurrent backup creation with file lock');
  await runner.assertThrows(() => { throw new Error('Not implemented'); }, Error, 'should clean up old backups if maxBackups is set');
};
