try {
  require('../src/commands/command-handler.js');
  console.log('loaded');
} catch (e) {
  console.error('error:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
