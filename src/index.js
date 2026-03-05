#!/usr/bin/env node

/**
 * GovnoBot for Node.js
 * Pure JavaScript Telegram bot with no external dependencies
 * Entry point for the application
 */

const fs = require('fs');
const path = require('path');

// Import core modules
const Config = require('./config');
const Logger = require('./utils/logger');
const TelegramAPIClient = require('./telegram/api-client');
const { startPolling } = require('./telegram/polling');
const CommandHandler = require('./commands/command-handler');
const RateLimiter = require('./security/rate-limiter');

let logger;
let config;
let client;
let rateLimiter;
let commandHandler;

/**
 * Initialize the bot with configuration and modules
 */
async function initialize() {
  try {
    // Load configuration
    config = new Config();
    
    // Initialize logger
    logger = new Logger(config.logging.level, config.logging.file);
    logger.info('🚀 GovnoBot Node.js starting...');
    logger.info(`Version: ${config.version}`);
    logger.info(`Data directory: ${config.dataDir}`);
    
    // Validate required configuration
    if (!config.telegram.token) {
      throw new Error('TELEGRAM_GOVNOBOT_TOKEN environment variable is required');
    }
    
    // Initialize Telegram API client
    client = new TelegramAPIClient(config.telegram.token);
    logger.info('✓ Telegram API client initialized');
    
    // Initialize rate limiter
    rateLimiter = new RateLimiter(
      config.rateLimit.requestsPerMinute,
      config.rateLimit.requestsPerHour,
      logger
    );
    logger.info('✓ Rate limiter initialized');
    
    // Initialize command handler
    commandHandler = new CommandHandler(
      client,
      config,
      logger,
      rateLimiter
    );
    logger.info('✓ Command handler initialized');
    
    // Create data directories if they don't exist
    ensureDataDirectories();
    
    logger.info('✅ Bot initialization complete');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error.message);
    logger?.error('Initialization failed', error);
    process.exit(1);
  }
}

/**
 * Ensure required data directories exist
 */
function ensureDataDirectories() {
  const dirs = [
    config.dataDir,
    path.join(config.dataDir, 'history'),
    path.join(config.dataDir, 'settings'),
    path.join(config.dataDir, 'backups'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    }
  });
}

/**
 * Handle incoming update from Telegram
 */
async function handleUpdate(update) {
  try {
    if (!update.message) {
      logger.debug('Ignoring update without message');
      return;
    }
    
    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || 'unknown';
    
    logger.debug(`Update from @${username} (${userId}): ${message.text}`);
    
    // Check rate limit
    if (!rateLimiter.isAllowed(chatId)) {
      const status = rateLimiter.getStatus(chatId);
      logger.warn(`Rate limit exceeded for user ${chatId}`);
      await client.sendMessage(
        chatId,
        `⏱️ Rate limit exceeded. You have ${status.remainingMinute}/${config.rateLimit.requestsPerMinute} requests this minute.\n\nResets in ${status.minutesUntilReset} minutes.`
      );
      return;
    }
    
    // Process command
    await commandHandler.handle(update);
    
  } catch (error) {
    logger.error(`Error handling update ${update.update_id}`, error);
    // Try to notify user of error
    if (update.message?.chat?.id) {
      try {
        await client.sendMessage(
          update.message.chat.id,
          '❌ An error occurred processing your request. The admin has been notified.'
        );
      } catch (e) {
        logger.error('Failed to send error message to user', e);
      }
    }
  }
}

/**
 * Start the bot polling loop
 */
async function start() {
  try {
    logger.info('🔄 Starting polling loop...');
    await startPolling(client, handleUpdate, {
      pollInterval: config.telegram.pollInterval,
      timeout: 30,
      logger: logger
    });
  } catch (error) {
    logger.error('Fatal error in polling loop', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  logger.info(`📴 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close any open resources
    if (logger) {
      logger.info('GovnoBot shut down successfully');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
}

// Handle process signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (logger) {
    logger.error('Uncaught exception', error);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (logger) {
    logger.error('Unhandled promise rejection', { reason });
  }
});

// Main execution
if (require.main === module) {
  (async () => {
    await initialize();
    await start();
  })();
}

module.exports = {
  initialize,
  start,
  shutdown,
  handleUpdate
};
