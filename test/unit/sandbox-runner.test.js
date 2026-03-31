// test/unit/sandbox-runner.test.js
// Unit tests for plugin sandboxing and audit logging
const assert = require('assert');
const { runPluginSandboxed } = require('../../src/plugins/sandbox-runner');

describe('Plugin Sandbox Runner', function() {
    it('executes safe code and returns result', async function() {
        const code = '2 + 2';
        const { result, error } = await runPluginSandboxed(code);
        assert.strictEqual(result, 4);
        assert.strictEqual(error, null);
    });

    it('blocks access to require, process, and global', async function() {
        const code = 'typeof require + "," + typeof process + "," + typeof global';
        const { result, error } = await runPluginSandboxed(code);
        assert.strictEqual(result, 'undefined,undefined,undefined');
        assert.strictEqual(error, null);
    });

    it('enforces timeout for infinite loops', async function() {
        const code = 'while(true){}';
        const { error } = await runPluginSandboxed(code, { timeoutMs: 100 });
        assert(error);
        assert(/Script execution timed out|timed out/.test(error.message));
    });

    it('provides safe API (log, getTime, random)', async function() {
        let logCalled = false;
        const code = 'log("hello"); getTime() > 0 && typeof random() === "number"';
        const { result, error } = await runPluginSandboxed(code, {
            safeContext: { log: () => { logCalled = true; } }
        });
        assert.strictEqual(result, true);
        assert.strictEqual(error, null);
        assert(logCalled);
    });

    it('logs audit events for success and error', async function() {
        const events = [];
        await runPluginSandboxed('1+1', { auditLog: e => events.push(e), pluginName: 'test' });
        await runPluginSandboxed('throw new Error("fail")', { auditLog: e => events.push(e), pluginName: 'test' });
        assert(events.length === 2);
        assert(events[0].ok === true);
        assert(events[1].ok === false);
        assert(events[1].error.includes('fail'));
    });
});
