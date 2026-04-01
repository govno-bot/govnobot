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
const AuditLogger = require('./security/audit-logger');
const FallbackChain = require('./ai/fallback-chain');
const NanoBanana2Client = require('./ai/nano-banana-2');
const OllamaClient = require('./ai/ollama');
const OpenAIClient = require('./ai/openai');
const ReminderStore = require('./storage/reminder-store');
const NotepadStore = require('./storage/notepad-store');
const ReminderScheduler = require('./reminder-scheduler');
const ProactiveAgent = require('./mood/proactive-agent');
const AgenticLoop = require('./ai/agentic-loop');

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
    config = Config.getConfig();
    
    // Initialize logger
    logger = new Logger(config.logging.level, config.logging.file);
    logger.info('🚀 GovnoBot Node.js starting...');
    logger.info(`Version: ${config.version}`);
    logger.info(`Data directory: ${config.data.dir}`);
    
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
    
    // Initialize AI clients
    const ollama = new OllamaClient({
      baseUrl: config.ai.ollamaUrl,
      model: config.ai.defaultModel
    });
    
    const openai = new OpenAIClient({
      apiKey: config.ai.openaiApiKey,
      model: config.ai.openaiModel
    });
    
    // Create AI fallback chain (Ollama first, then OpenAI)
    // The order is determined by config.ai.fallbackOrder, but implementing full dynamic loading is complex.
    // For now, we'll just hardcode Ollama -> OpenAI based on typical local-first preference,
    // or respect the array order if we want to be fancy.
    // Let's implement dynamic provider selection based on config.ai.fallbackOrder.
    
    const nanoBanana2 = new NanoBanana2Client({ model: 'nano-banana-2' });

    const providerMap = {
      'nano-banana-2': nanoBanana2,
      'ollama': ollama,
      'openai': openai
    };
    
    const providers = [];
    config.ai.fallbackOrder.forEach(name => {
      const provider = providerMap[name.toLowerCase()];
      if (provider) {
        providers.push(provider);
      } else {
        logger.warn(`⚠️ Unknown AI provider in fallback order: ${name}`);
      }
    });
    
    // Add any configured providers that were not in fallbackOrder (fallback to implicit enabled)
    Object.keys(providerMap).forEach(key => {
      if (!providers.includes(providerMap[key]) && config.ai.fallbackOrder.length === 0) {
        // If config is empty, enable all? Or just default?
        // Let's stick to explicit config or hardcoded default in Config class.
      }
    });

    if (providers.length === 0) {
      logger.warn('⚠️ No valid AI providers configured in fallback order. Defaulting to Ollama -> OpenAI.');
      providers.push(ollama);
      providers.push(openai);
    }
    
    const fallbackChain = new FallbackChain(providers);
    logger.info(`✓ AI chain initialized with: ${providers.map(p => p.name).join(', ')}`);

    // Initialize audit logger
    const auditLogger = new AuditLogger(
      config.security.auditLogFile,
      config.security.auditLogSecret
    );
    logger.info('✓ Audit logger initialized');

    // Initialize reminder store
    const reminderStore = new ReminderStore(logger);
    logger.info('✅ Reminder store initialized');

    // Initialize notepad store
    const notepadStore = new NotepadStore(config.data.dir);
    logger.info('✅ Notepad store initialized');

    // Initialize command handler
    commandHandler = new CommandHandler(
      client,
      config,
      logger,
      rateLimiter,
      fallbackChain,
      auditLogger,
      reminderStore,
      notepadStore
    );
    logger.info('✅ Command handler initialized');

    // Initialize and start reminder scheduler
    const reminderScheduler = new ReminderScheduler(reminderStore, client, logger);
    reminderScheduler.start();
    logger.info('✓ Reminder scheduler started');

    // Initialize and start proactive agent
    const proactiveAgent = new ProactiveAgent({
      logger,
      telegramApiClient: client,
      adminChatId: config.telegram.adminChatId,
      fallbackChain,
      notepadStore,
      historyStore: undefined // Note: historyStore was undefined here previously
    });
    proactiveAgent.start();
    logger.info('✓ Proactive agent started');

    // Initialize and start Advanced Agentic Loop
    const agenticLoop = new AgenticLoop({
      logger,
      telegramApiClient: client,
      adminChatId: config.telegram.adminChatId,
      fallbackChain,
      notepadStore,
      reminderStore,
      historyStore: undefined
    });
    if (config.profiling?.agenticLoopEnabled) {
      agenticLoop.enableProfiling();
    }
    agenticLoop.start();
    logger.info('✓ Advanced Agentic Loop started');

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
    config.data.dir,
    path.join(config.data.dir, 'history'),
    path.join(config.data.dir, 'settings'),
    path.join(config.data.dir, 'backups'),
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
    // Get bot info
    try {
      const botMe = await client.getMe();
      if (botMe && botMe.result && botMe.result.username) {
        commandHandler.setBotInfo(botMe.result);
        logger.info(`🤖 Bot Username: @${botMe.result.username}`);
      }
    } catch (err) {
      logger.warn('Could not fetch bot info from Telegram API', err);
    }

    // Set bot commands menu
    try {
      const menuCommands = commandHandler.getMenuCommands();
      await client.setMyCommands(menuCommands);
      logger.info(`✅ Set ${menuCommands.length} commands in bot menu`);
    } catch (err) {
      logger.warn('Could not set bot commands menu', err);
    }

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
