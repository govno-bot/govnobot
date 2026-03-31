// src/plugins/sandbox-runner.js
// Secure plugin sandbox runner for untrusted code (Node.js built-in modules only)
// Provides isolation, resource limits, and audit logging hooks

const vm = require('vm');
const { randomBytes } = require('crypto');
const { performance } = require('perf_hooks');

// Safe API surface exposed to plugins
function createSafeAPI(context = {}) {
    return {
        // Add safe APIs here (e.g., logging, limited timers, etc.)
        log: context.log || (() => {}),
        getTime: () => Date.now(),
        random: () => Math.random(),
        // ...extend as needed
    };
}

/**
 * Runs untrusted plugin code in a secure VM context with resource limits.
 * @param {string} code - Plugin JS code as string
 * @param {object} [options] - { timeoutMs, filename, pluginName, safeContext, auditLog }
 * @returns {Promise<{ result: any, error: Error|null, durationMs: number, auditId: string }>} 
 */

const RecoveryManager = require('../utils/recovery-manager');
// Singleton for plugin recovery (could be injected for testability)
const pluginRecovery = new RecoveryManager({
    logger: null,
    adminNotifier: null,
    maxRetries: 3,
    backoffBaseMs: 60000
});

async function runPluginSandboxed(code, options = {}) {
    const timeoutMs = options.timeoutMs || 1000;
    const filename = options.filename || 'plugin.js';
    const pluginName = options.pluginName || 'unknown';
    const safeContext = options.safeContext || {};
    const auditLog = options.auditLog || (() => {});
    const adminNotifier = options.adminNotifier || null;
    if (adminNotifier && !pluginRecovery.adminNotifier) pluginRecovery.adminNotifier = adminNotifier;
    const auditId = randomBytes(8).toString('hex');
    const sandbox = {
        ...createSafeAPI(safeContext),
        // No access to require, process, global, etc.
    };
    const context = vm.createContext(sandbox, { name: pluginName });
    let result = undefined;
    let error = null;
    const start = performance.now();
    if (!pluginRecovery.shouldRetry(pluginName)) {
        return {
            result: undefined,
            error: new Error(`Plugin ${pluginName} exceeded max retries, skipping execution.`),
            durationMs: 0,
            auditId,
        };
    }
    try {
        const script = new vm.Script(code, { filename });
        // Run with timeout (sync)
        result = script.runInContext(context, { timeout: timeoutMs });
        auditLog({
            auditId,
            pluginName,
            filename,
            event: 'plugin-exec',
            ok: true,
            result: typeof result === 'string' ? result.slice(0, 200) : result,
            durationMs: performance.now() - start,
            timestamp: new Date().toISOString(),
        });
        pluginRecovery.recordSuccess(pluginName);
    } catch (e) {
        error = e;
        auditLog({
            auditId,
            pluginName,
            filename,
            event: 'plugin-exec',
            ok: false,
            error: e && (e.stack || e.message || String(e)),
            durationMs: performance.now() - start,
            timestamp: new Date().toISOString(),
        });
        pluginRecovery.recordFailure(pluginName, e);
    }
    return {
        result,
        error,
        durationMs: performance.now() - start,
        auditId,
    };
}

module.exports = {
    runPluginSandboxed,
    createSafeAPI,
};
