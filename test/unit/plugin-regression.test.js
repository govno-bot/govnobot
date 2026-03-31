// test/unit/plugin-regression.test.js
// Automated regression tests for all plugins (discovered in src/plugins)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runPluginSandboxed } = require('../../src/plugins/sandbox-runner');

describe('Plugin Regression Suite', function() {
  const pluginsDir = path.join(__dirname, '../../src/plugins');
  const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

  for (const file of pluginFiles) {
    it(`loads and runs plugin: ${file}`, async function() {
      const code = fs.readFileSync(path.join(pluginsDir, file), 'utf8');
      // Try to run the plugin code in the sandbox (should not throw)
      const { error } = await runPluginSandboxed(code, { pluginName: file, timeoutMs: 500 });
      assert.strictEqual(error, null, `Plugin ${file} should run without error (got: ${error && error.message})`);
    });
  }
});
