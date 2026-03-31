// src/utils/recovery-manager.js
// Automated self-healing/recovery for failed jobs, reminders, and plugin crashes

class RecoveryManager {
    constructor({ logger, adminNotifier, maxRetries = 3, backoffBaseMs = 60000 }) {
        this.logger = logger;
        this.adminNotifier = adminNotifier; // function(message)
        this.maxRetries = maxRetries;
        this.backoffBaseMs = backoffBaseMs;
        this.failedItems = new Map(); // key: itemId, value: { count, lastError, nextRetry }
    }

    shouldRetry(itemId) {
        const entry = this.failedItems.get(itemId);
        if (!entry) return true;
        if (entry.count >= this.maxRetries) return false;
        return Date.now() >= entry.nextRetry;
    }

    recordFailure(itemId, error) {
        const now = Date.now();
        let entry = this.failedItems.get(itemId);
        if (!entry) {
            entry = { count: 1, lastError: error, nextRetry: now + this.backoffBaseMs };
        } else {
            entry.count++;
            entry.lastError = error;
            entry.nextRetry = now + this.backoffBaseMs * Math.pow(2, entry.count - 1);
        }
        this.failedItems.set(itemId, entry);
        if (entry.count === this.maxRetries && this.adminNotifier) {
            this.adminNotifier(`❗ Item ${itemId} failed ${entry.count} times. Last error: ${error && (error.message || error)}`);
        }
        if (this.logger) this.logger.warn(`RecoveryManager: Failure for ${itemId} (attempt ${entry.count}): ${error && (error.message || error)}`);
    }

    recordSuccess(itemId) {
        if (this.failedItems.has(itemId)) {
            this.failedItems.delete(itemId);
            if (this.logger) this.logger.info(`RecoveryManager: Success for ${itemId}, removed from failed list.`);
        }
    }
}

module.exports = RecoveryManager;
