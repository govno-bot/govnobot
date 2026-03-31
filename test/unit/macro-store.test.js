// Unit tests for macro command features
const assert = require('assert');
const MacroStore = require('../../src/storage/macro-store');
const fs = require('fs');
const path = require('path');

describe('MacroStore', function() {
  const testUserId = 'testuser';
  const macroFile = path.join(__dirname, '../../data/macros/user-testuser.json');

  afterEach(async function() {
    if (fs.existsSync(macroFile)) fs.unlinkSync(macroFile);
  });

  it('should add and list macros', async function() {
    await MacroStore.addMacro(testUserId, 'hello', '/ask Hello, world!');
    const macros = await MacroStore.listMacros(testUserId);
    assert.deepStrictEqual(macros, [['hello', '/ask Hello, world!']]);
  });

  it('should get a macro by name', async function() {
    await MacroStore.addMacro(testUserId, 'foo', '/ask foo');
    const macro = await MacroStore.getMacro(testUserId, 'foo');
    assert.strictEqual(macro, '/ask foo');
  });

  it('should delete a macro', async function() {
    await MacroStore.addMacro(testUserId, 'bar', '/ask bar');
    await MacroStore.deleteMacro(testUserId, 'bar');
    const macro = await MacroStore.getMacro(testUserId, 'bar');
    assert.strictEqual(macro, null);
  });

  it('should overwrite an existing macro', async function() {
    await MacroStore.addMacro(testUserId, 'dup', '/ask 1');
    await MacroStore.addMacro(testUserId, 'dup', '/ask 2');
    const macro = await MacroStore.getMacro(testUserId, 'dup');
    assert.strictEqual(macro, '/ask 2');
  });
});
