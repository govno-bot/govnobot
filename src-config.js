/**
 * Configuration Management
 * Loads configuration from environment variables and .env file
 * No external dependencies (no dotenv package)
 */

const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.loaded = false;
    this.telegram = {};
    this.ollama = {};
    this.openai = {};
    this.bot = {};
    this.data = {};
    this.logging = {};
    this.security = {};
  }

  /**
   * Load configuration from .env file if it exists
   */
  loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      return; // .env is optional
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        // Skip comments and empty lines
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Parse KEY=VALUE
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) {
          continue;
        }

        const key = trimmed.substring(0, equalsIndex).trim();
        const value = trimmed.substring(equalsIndex + 1).trim();

        // Only set if not already in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch (error) {
      console.warn('Warning: Could not read .env file:', error.message);
    }
  }

  /**
   * Get environment variable with default value
   */
  env(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  /**
   * Get environment variable as integer
   */
  envInt(key, defaultValue = 0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get environment variable as boolean
   */
  envBool(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get environment variable as array (comma-separated)
   */
  envArray(key, defaultValue = []) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(item => item);
  }

  /**
   * Load and validate configuration
   */
  load() {
    if (this.loaded) {
      return this;
    }

    // Load .env file first
    this.loadEnvFile();

    // Telegram configuration
    this.telegram.token = this.env('TELEGRAM_GOVNOBOT_TOKEN');
    this.telegram.adminUsername = this.env('TELEGRAM_ADMIN_USERNAME');
    this.telegram.adminChatId = this.envInt('TELEGRAM_ADMIN_CHATID');
    this.telegram.pollInterval = this.envInt('BOT_POLL_INTERVAL', 30000);

    // Ollama configuration
    this.ollama.url = this.env('OLLAMA_URL', 'http://localhost:11434');
    this.ollama.model = this.env('OLLAMA_MODEL', 'llama2');
    this.ollama.availableModels = this.envArray('AVAILABLE_MODELS', [
      'llama2', 'mistral', 'neural-chat', 'dolphin-mixtral'
    ]);

    // OpenAI configuration (optional fallback)
    this.openai.apiKey = this.env('OPENAI_API_KEY');

    // Bot configuration
    this.bot.pollInterval = this.telegram.pollInterval;
    this.bot.messageChunkSize = this.envInt('BOT_MESSAGE_CHUNK_SIZE', 4096);
    this.bot.rateLimitPerMin = this.envInt('BOT_RATE_LIMIT_REQUESTS_PER_MIN', 10);
    this.bot.rateLimitPerHour = this.envInt('BOT_RATE_LIMIT_REQUESTS_PER_HOUR', 100);

    // Data storage
    this.data.dir = this.env('BOT_DATA_DIR', './data');
    this.data.historyDir = path.join(this.data.dir, 'history');
    this.data.settingsDir = path.join(this.data.dir, 'settings');
    this.data.backupsDir = path.join(this.data.dir, 'backups');
    this.data.backupRetention = this.envInt('BOT_BACKUP_RETENTION', 10);

    // Logging
    this.logging.level = this.env('BOT_LOG_LEVEL', 'info');
    this.logging.file = this.env('BOT_LOG_FILE', path.join(this.data.dir, 'bot.log'));

    // Security
    this.security.adminIpWhitelist = this.envArray('ADMIN_IP_WHITELIST', ['127.0.0.1', '::1']);
    this.security.shCommandWhitelist = this.envArray('SH_COMMAND_WHITELIST', [
      'ls', 'ps', 'whoami', 'date', 'pwd'
    ]);
    this.security.auditLogPath = path.join(this.data.dir, 'audit.log');

    this.loaded = true;

    return this;
  }

  /**
   * Validate required configuration
   * @throws {Error} if required configuration is missing
   */
  validate() {
    const errors = [];

    if (!this.telegram.token) {
      errors.push('TELEGRAM_GOVNOBOT_TOKEN is required');
    }

    if (this.telegram.token && this.telegram.token === 'your_bot_token_here') {
      errors.push('TELEGRAM_GOVNOBOT_TOKEN must be configured (not placeholder)');
    }

    if (!this.telegram.adminUsername && !this.telegram.adminChatId) {
      errors.push('At least one of TELEGRAM_ADMIN_USERNAME or TELEGRAM_ADMIN_CHATID is required');
    }

    if (this.bot.messageChunkSize < 100 || this.bot.messageChunkSize > 4096) {
      errors.push('BOT_MESSAGE_CHUNK_SIZE must be between 100 and 4096');
    }

    if (errors.length > 0) {
      throw new Error('Configuration validation failed:\n  - ' + errors.join('\n  - '));
    }

    return true;
  }

  /**
   * Get summary of current configuration (safe for logging)
   */
  getSummary() {
    return {
      telegram: {
        tokenConfigured: !!this.telegram.token,
        adminUsername: this.telegram.adminUsername || '(not set)',
        adminChatId: this.telegram.adminChatId || '(not set)',
        pollInterval: this.telegram.pollInterval
      },
      ollama: {
        url: this.ollama.url,
        model: this.ollama.model,
        availableModels: this.ollama.availableModels
      },
      openai: {
        configured: !!this.openai.apiKey
      },
      bot: {
        messageChunkSize: this.bot.messageChunkSize,
        rateLimitPerMin: this.bot.rateLimitPerMin,
        rateLimitPerHour: this.bot.rateLimitPerHour
      },
      data: {
        dir: this.data.dir,
        backupRetention: this.data.backupRetention
      },
      logging: {
        level: this.logging.level,
        file: this.logging.file
      }
    };
  }
}

// Singleton instance
let configInstance = null;

/**
 * Get configuration instance (singleton)
 * @returns {Config} Configuration instance
 */
function getConfig() {
  if (!configInstance) {
    configInstance = new Config();
    configInstance.load();
  }
  return configInstance;
}

module.exports = {
  Config,
  getConfig
};
