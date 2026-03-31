// test/unit/sandbox-runner-recovery.test.js
const { runPluginSandboxed } = require('../../src/plugins/sandbox-runner');
const RecoveryManager = require('../../src/utils/recovery-manager');

describe('Plugin sandbox runner with recovery', () => {
    let recovery;
    let adminMessages;
    let logger;

    beforeEach(() => {
        adminMessages = [];
        logger = { warn: jest.fn(), info: jest.fn() };
        recovery = new RecoveryManager({
            logger,
            adminNotifier: (msg) => adminMessages.push(msg),
            maxRetries: 2,
            backoffBaseMs: 10,
        });
    });

    test('retries failed plugin execution and notifies admin', async () => {
        const badCode = 'throw new Error("plugin crash!")';
        for (let i = 0; i < 2; i++) {
            if (recovery.shouldRetry('plugin1')) {
                const { error } = await runPluginSandboxed(badCode, {});
                if (error) recovery.recordFailure('plugin1', error);
            }
        }
        expect(recovery.shouldRetry('plugin1')).toBe(false);
        expect(adminMessages.length).toBe(1);
        expect(adminMessages[0]).toMatch(/plugin1/);
    });

    test('success clears failure state', async () => {
        const badCode = 'throw new Error("fail")';
        if (recovery.shouldRetry('plugin2')) {
            const { error } = await runPluginSandboxed(badCode, {});
            if (error) recovery.recordFailure('plugin2', error);
        }
        // Now simulate a success
        recovery.recordSuccess('plugin2');
        expect(recovery.failedItems.has('plugin2')).toBe(false);
    });
});
