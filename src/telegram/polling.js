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
  
  logger.info('🔄 Starting Telegram polling...');
  
  while (true) {
    try {
      logger.debug(`Polling for updates (offset: ${offset})`);
      
      // Get updates with long polling timeout
      const response = await client.getUpdates(offset, timeout);
      
      if (!response.ok || !response.result) {
        logger.warn('Invalid API response');
        await sleep(baseBackoff * backoffMultiplier);
        backoffMultiplier = Math.min(backoffMultiplier * 2, maxBackoff / baseBackoff);
        continue;
      }
      
      // Process each update
      for (const update of response.result) {
        try {
          await updateHandler(update);
          offset = update.update_id + 1;
        } catch (error) {
          logger.error(`Error processing update ${update.update_id}`, error);
          // Continue with next update even if handler fails
        }
      }
      
      // Reset backoff on successful polling
      backoffMultiplier = 1;
      
      // Wait before next poll
      if (response.result.length === 0) {
        logger.debug(`No updates, waiting ${pollInterval}ms before next poll`);
        await sleep(pollInterval);
      }
      
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
