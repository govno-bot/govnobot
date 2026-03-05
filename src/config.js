/**
 * Configuration management
 * Loads and validates environment variables
 * No external dependencies - uses native Node.js
 */

const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.version = '1.0.0';
    this.projectRoot = path.dirname(path.dirname(__dirname));
    this.load();
  }

  /**
   * Load configuration from environment variables and .env file
   */
  load() {
    // Load from .env file if it exists
    this.loadEnvFile();
    
    // Parse and validate configuration
    this.telegram = this.parseTelegramConfig();
    this.ai = this.parseAIConfig();
    this.rateLimit = this.parseRateLimitConfig();
    this.logging = this.parseLoggingConfig();
    this.security = this.parseSecurityConfig();
    this.dataDir = process.env.BOT_DATA_DIR || path.join(this.projectRoot, 'data');
    this.backupRetention = parseInt(process.env.BOT_BACKUP_RETENTION || '10', 10);
    
    this.validateRequiredFields();
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvFile() {
    const envPath = path.join(this.projectRoot, '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        line = line.trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
          return;
        }
        
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
          return;
        }
        
        const key = line.substring(0, separatorIndex).trim();
        const value = line.substring(separatorIndex + 1).trim();
        
        // Remove quotes if present
        const unquotedValue = value.replace(/^["']|["']$/g, '');
        
        // Only set if not already in environment
        if (!process.env[key]) {
          process.env[key] = unquotedValue;
        }
      });
    }
  }

  /**
   * Parse Telegram-related configuration
   */
  parseTelegramConfig() {
    return {
      token: process.env.TELEGRAM_GOVNOBOT_TOKEN || '',
      adminUsername: process.env.TELEGRAM_ADMIN_USERNAME || '',
      adminChatId: parseInt(process.env.TELEGRAM_GOVNOBOT_ADMIN_CHATID || '0', 10),
      pollInterval: parseInt(process.env.BOT_POLL_INTERVAL || '30000', 10),
      messageChunkSize: parseInt(process.env.BOT_MESSAGE_CHUNK_SIZE || '4096', 10),
    };
  }

  /**
   * Parse AI service configuration
   */
  parseAIConfig() {
    const availableModels = (process.env.AVAILABLE_MODELS || 'llama2')
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    
    return {
      defaultModel: process.env.OLLAMA_MODEL || 'llama2',
      availableModels: availableModels,
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
      fallbackOrder: ['ollama', 'github', 'openai'], // Try in order
    };
  }

  /**
   * Parse rate limiting configuration
   */
  parseRateLimitConfig() {
    return {
      requestsPerMinute: parseInt(process.env.BOT_RATE_LIMIT_REQUESTS_PER_MIN || '10', 10),
      requestsPerHour: parseInt(process.env.BOT_RATE_LIMIT_REQUESTS_PER_HOUR || '100', 10),
      enabled: process.env.BOT_RATE_LIMIT_ENABLED !== 'false',
    };
  }

  /**
   * Parse logging configuration
   */
  parseLoggingConfig() {
    return {
      level: process.env.BOT_LOG_LEVEL || 'info', // debug, info, warn, error
      file: process.env.BOT_LOG_FILE || path.join(this.projectRoot, 'data', 'bot.log'),
      console: process.env.BOT_LOG_CONSOLE !== 'false',
    };
  }

  /**
   * Parse security configuration
   */
  parseSecurityConfig() {
    const ipWhitelist = (process.env.ADMIN_IP_WHITELIST || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean);
    
    const shCommandWhitelist = (process.env.SH_COMMAND_WHITELIST || '')
      .split(',')
      .map(cmd => cmd.trim())
      .filter(Boolean);
    
    return {
      ipWhitelist: ipWhitelist,
      shCommandWhitelist: shCommandWhitelist,
      requireIpWhitelist: process.env.ADMIN_IP_WHITELIST_REQUIRED !== 'false',
    };
  }

  /**
   * Validate that all required fields are present
   */
  validateRequiredFields() {
    const errors = [];
    
    if (!this.telegram.token) {
      errors.push('TELEGRAM_GOVNOBOT_TOKEN environment variable is required');
    }
    
    if (!this.telegram.adminUsername && !this.telegram.adminChatId) {
      errors.push('Either TELEGRAM_ADMIN_USERNAME or TELEGRAM_ADMIN_CHATID must be set');
    }
    
    if (errors.length > 0) {
      throw new Error('Configuration validation failed:\n' + errors.join('\n'));
    }
  }

  /**
   * Get all configuration as object
   */
  toJSON() {
    return {
      version: this.version,
      telegram: this.telegram,
      ai: this.ai,
      rateLimit: this.rateLimit,
      logging: this.logging,
      security: this.security,
      dataDir: this.dataDir,
      backupRetention: this.backupRetention,
    };
  }
}

module.exports = Config;
