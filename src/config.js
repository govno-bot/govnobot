/**
 * Configuration management
 * Loads and validates environment variables
 * No external dependencies - uses native Node.js
 */

const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.projectRoot = path.dirname(__dirname); // Correctly sets project root from src/

    // Derive version from environment override or package.json so it's not hardcoded
    try {
      const envVer = process.env.BOT_VERSION;
      const pkgPath = path.join(this.projectRoot, 'package.json');
      if (envVer) {
        this.version = envVer;
      } else if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        this.version = (pkg && pkg.version) ? String(pkg.version) : '0.0.0';
      } else {
        this.version = '0.0.0';
      }
    } catch (e) {
      this.version = process.env.BOT_VERSION || '0.0.0';
    }
    this.dataDir = process.env.BOT_DATA_DIR || path.join(this.projectRoot, 'data');
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
    this.profiling = this.parseProfilingConfig();
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
    const defaultModels = ['deepseek-r1:8b', 'mistral', 'gpt-4', 'gpt-3.5-turbo'];
    const availableModels = (process.env.AVAILABLE_MODELS || defaultModels.join(','))
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    
    const fallbackOrder = (process.env.AI_FALLBACK_ORDER || 'ollama,openai')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    return {
      defaultModel: process.env.OLLAMA_MODEL || 'deepseek-r1:8b',
      availableModels: availableModels,
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
      fallbackOrder: fallbackOrder, 
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
   * Parse profiling configuration for long-running loops and diagnostics
   */
  parseProfilingConfig() {
    return {
      // If true, AgenticLoop will log memory/cpu stats each iteration.
      agenticLoopEnabled: process.env.BOT_AGENTIC_LOOP_PROFILING === 'true',
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
      auditLogSecret: process.env.AUDIT_LOG_SECRET || 'default-insecure-secret-please-change',
      auditLogFile: process.env.AUDIT_LOG_FILE || path.join(this.projectRoot, 'data', 'audit.log'),
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
      profiling: this.profiling,
      security: this.security,
      dataDir: this.dataDir,
      backupRetention: this.backupRetention,
    };
  }
}

/**
 * Default data directory (used by tests and utilities)
 */
Config.DATA_DIR = path.join(__dirname, '..', 'data');

module.exports = Config;
