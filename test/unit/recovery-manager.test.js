// test/unit/recovery-manager.test.js
const RecoveryManager = require('../../src/utils/recovery-manager');

function mockLogger() {
    return {
        warn: jest.fn(),
        info: jest.fn(),
    };
}

describe('RecoveryManager', () => {
    let recovery;
    let adminMessages;
    let logger;

    beforeEach(() => {
        adminMessages = [];
        logger = mockLogger();
        recovery = new RecoveryManager({
            logger,
            adminNotifier: (msg) => adminMessages.push(msg),
            maxRetries: 2,
            backoffBaseMs: 1000,
        });
    });

    test('should allow retry if not exceeded', () => {
        expect(recovery.shouldRetry('foo')).toBe(true);
        recovery.recordFailure('foo', new Error('fail1'));
        expect(recovery.shouldRetry('foo')).toBe(false); // backoff not elapsed
        jest.advanceTimersByTime(1000);
        expect(recovery.shouldRetry('foo')).toBe(true);
    });

    test('should stop retrying after maxRetries', () => {
        recovery.recordFailure('bar', new Error('fail1'));
        jest.advanceTimersByTime(1000);
        recovery.recordFailure('bar', new Error('fail2'));
        jest.advanceTimersByTime(2000);
        expect(recovery.shouldRetry('bar')).toBe(false);
    });

    test('should notify admin on maxRetries', () => {
        recovery.recordFailure('baz', new Error('fail1'));
        jest.advanceTimersByTime(1000);
        recovery.recordFailure('baz', new Error('fail2'));
        expect(adminMessages.length).toBe(1);
        expect(adminMessages[0]).toMatch(/baz/);
    });

    test('should clear failure on success', () => {
        recovery.recordFailure('qux', new Error('fail1'));
        jest.advanceTimersByTime(1000);
        recovery.recordSuccess('qux');
        expect(recovery.failedItems.has('qux')).toBe(false);
    });
});
