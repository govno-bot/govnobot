/**
 * Telegram Polling Loop
 * Long polling implementation for receiving updates
 */

/**
 * Start the polling loop
 * @param {TelegramAPIClient} client - API client
 * @param {function} updateHandler - Handler function for each update
 * @param {object} options - Polling options
 */
async function startPolling(client, updateHandler, options = {}) {
  const pollInterval = options.pollInterval || 30000;
  const timeout = options.timeout || 30;
  const logger = options.logger || console;
  
  let offset = 0;
  let backoffMultiplier = 1;
  const maxBackoff = 300000; // 5 minutes
  const baseBackoff = 1000; // 1 second
  const apiTimeout = 60000; // 60 second timeout for API calls
  
  logger.info('🔄 Starting Telegram polling...');
  
  while (true) {
    try {
      logger.debug(`Polling for updates (offset: ${offset})`);
      
      // Get updates with long polling timeout and a hard timeout
      const pollPromise = client.getUpdates(offset, timeout);
      const response = await Promise.race([
        pollPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Polling timeout exceeded')), apiTimeout)
        )
      ]);
      
      logger.debug(`[POLLING] Got response, ok=${response.ok}`);
      
      if (!response.ok || !response.result) {
        logger.warn('Invalid API response');
        await sleep(baseBackoff * backoffMultiplier);
        backoffMultiplier = Math.min(backoffMultiplier * 2, maxBackoff / baseBackoff);
        continue;
      }
      
      logger.debug(`[POLLING] Processing ${response.result.length} updates`);
      
      // Process each update
      for (const update of response.result) {
        try {
          logger.info(`[POLLING] Got update: ${JSON.stringify({update_id: update.update_id, type: update.message ? 'message' : update.callback_query ? 'callback' : 'other'})}`);
          logger.debug(`[POLLING] Calling updateHandler for update ${update.update_id}`);
          await updateHandler(update);
          logger.debug(`[POLLING] updateHandler completed for update ${update.update_id}`);
          offset = update.update_id + 1;
        } catch (error) {
          logger.error(`Error processing update ${update.update_id}`, error);
          // Continue with next update even if handler fails
        }
      }
      
      // Reset backoff on successful polling
      if (response.result.length === 0) {
        logger.debug(`[POLLING] No updates received (offset: ${offset})`);
      } else {
        logger.info(`[POLLING] Processed ${response.result.length} update(s)`);
      }
      backoffMultiplier = 1;
      
      logger.debug(`[POLLING] Waiting for next poll iteration`);
      
      // Wait before next poll
      if (response.result.length === 0) {
        logger.debug(`No updates, waiting ${pollInterval}ms before next poll`);
        await sleep(pollInterval);
      }
      logger.debug(`[POLLING] Loop iteration complete, restarting...`);
      
    } catch (error) {
      logger.error('Polling error', error);
      
      // Exponential backoff on error
      const backoffMs = Math.min(baseBackoff * backoffMultiplier, maxBackoff);
      logger.warn(`Retrying in ${backoffMs}ms (attempt ${Math.log2(backoffMultiplier)})`);
      
      await sleep(backoffMs);
      backoffMultiplier = Math.min(backoffMultiplier * 2, maxBackoff / baseBackoff);
    }
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  startPolling,
  sleep,
};
