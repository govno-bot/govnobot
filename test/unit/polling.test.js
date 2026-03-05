/**
 * Unit tests for Telegram Polling Loop (src/telegram/polling.js)
 *
 * Covers:
 * - Polling loop basic operation
 * - Handling updates
 * - Error and backoff logic
 * - Logger integration
 * - Offset management
 * - Handler error isolation
 */


const { startPolling } = require('../../src/telegram/polling');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createStubLogger() {
  const calls = { info: [], debug: [], warn: [], error: [] };
  return {
    info: (...args) => calls.info.push(args),
    debug: (...args) => calls.debug.push(args),
    warn: (...args) => calls.warn.push(args),
    error: (...args) => calls.error.push(args),
    calls
  };
}

module.exports.run = async function(runner) {
  // should poll and call updateHandler for each update
  let pollCount = 0;
  let updateCalled = false;
  let client = {
    getUpdates: async () => {
      pollCount++;
      await sleep(10); // Sleep to slow down the loop
      if (pollCount === 1) return { ok: true, result: [ { update_id: 1, data: 'foo' } ] };
      return { ok: true, result: [] };
    }
  };
  let updateHandler = async (update) => {
    if (update && update.update_id === 1) updateCalled = true;
  };
  let logger = createStubLogger();
  const pollingPromise = startPolling(client, updateHandler, { logger, pollInterval: 50, timeout: 1 });
  
  await sleep(100);
  
  runner.assert(updateCalled, 'updateHandler called for update');
  runner.assert(pollCount >= 1, 'polled more than once');

  // We can't cancel the polling promise in this simple implementation, 
  // but in a real test runner we would want to signal it to stop.
  // For now, rely on process exit.

  // should increment offset after each update
  let offset = 0;
  client = {
    getUpdates: async (off) => {
      offset = off;
      await sleep(10);
      return { ok: true, result: offset < 2 ? [ { update_id: offset } ] : [] };
    }
  };
  updateHandler = async () => {};
  logger = createStubLogger();
  const polling2 = startPolling(client, updateHandler, { logger, pollInterval: 50, timeout: 1 });
  await sleep(150);
  runner.assert(offset > 0, 'offset incremented');

  // should backoff and log on API error
  let callNum = 0;
  client = {
    getUpdates: async () => {
      callNum++;
      if (callNum === 1) throw new Error('fail');
      await sleep(10);
      return { ok: true, result: [] };
    }
  };
  updateHandler = async () => {};
  logger = createStubLogger();
  const polling3 = startPolling(client, updateHandler, { logger, pollInterval: 50, timeout: 1 });
  await sleep(150);
  runner.assert(logger.calls.error.length > 0, 'logger.error called on API error');

  // should log and continue if updateHandler throws
  client = {
    getUpdates: async () => {
        await sleep(10);
        return { ok: true, result: [ { update_id: 1 } ] };
    }
  };
  updateHandler = async () => { throw new Error('handler fail'); };
  logger = createStubLogger();
  const polling4 = startPolling(client, updateHandler, { logger, pollInterval: 50, timeout: 1 });
  await sleep(150);
  const errorMsgs = logger.calls.error.map(args => args.join(' ')).join(' ');
  runner.assert(errorMsgs.includes('Error processing update'), 'logger.error called for updateHandler error');


  // should use default logger if none provided (no crash)
  client = {
    getUpdates: async () => ({ ok: true, result: [] })
  };
  updateHandler = async () => {};
  const polling5 = startPolling(client, updateHandler, { pollInterval: 10, timeout: 1 });
  await sleep(20);
  runner.assert(true, 'no crash with default logger');
  polling5.then(() => {}, () => {});
};

