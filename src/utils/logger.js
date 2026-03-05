/**
 * Structured Logger
 * Handles console and file logging with different log levels
 * No external dependencies
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(level = 'info', filePath = null) {
    this.level = level;
    this.filePath = filePath;
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    
    // Ensure log file directory exists
    if (this.filePath) {
      const logDir = path.dirname(this.filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Check if message should be logged based on level
   */
  shouldLog(msgLevel) {
    return this.logLevels[msgLevel] >= this.logLevels[this.level];
  }

  /**
   * Format timestamp as ISO string
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log entry
   */
  format(level, message, meta = null) {
    const timestamp = this.getTimestamp();
    let entry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (meta) {
      if (meta instanceof Error) {
        entry += `\n  Error: ${meta.message}\n  Stack: ${meta.stack}`;
      } else if (typeof meta === 'object') {
        entry += `\n  ${JSON.stringify(meta, null, 2)}`;
      } else {
        entry += `\n  ${meta}`;
      }
    }
    
    return entry;
  }

  /**
   * Get colored prefix for console output
   */
  getColoredPrefix(level) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    
    const reset = '\x1b[0m';
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    
    return `${colors[level]}${emoji[level]} ${level.toUpperCase()}${reset}`;
  }

  /**
   * Write log entry to file
   */
  writeToFile(entry) {
    if (!this.filePath) return;
    
    try {
      fs.appendFileSync(this.filePath, entry + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Log at debug level
   */
  debug(message, meta = null) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.format('debug', message, meta);
    const prefix = this.getColoredPrefix('debug');
    
    console.log(`${prefix} ${message}`);
    this.writeToFile(entry);
  }

  /**
   * Log at info level
   */
  info(message, meta = null) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.format('info', message, meta);
    const prefix = this.getColoredPrefix('info');
    
    console.log(`${prefix} ${message}`);
    this.writeToFile(entry);
  }

  /**
   * Log at warn level
   */
  warn(message, meta = null) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.format('warn', message, meta);
    const prefix = this.getColoredPrefix('warn');
    
    console.warn(`${prefix} ${message}`);
    this.writeToFile(entry);
  }

  /**
   * Log at error level
   */
  error(message, meta = null) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.format('error', message, meta);
    const prefix = this.getColoredPrefix('error');
    
    console.error(`${prefix} ${message}`);
    this.writeToFile(entry);
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    const childLogger = Object.create(this);
    childLogger.context = context;
    
    // Override format to include context
    const originalFormat = childLogger.format.bind(childLogger);
    childLogger.format = (level, message, meta) => {
      const contextStr = typeof context === 'object' 
        ? JSON.stringify(context)
        : context;
      return originalFormat(level, `[${contextStr}] ${message}`, meta);
    };
    
    return childLogger;
  }
}

module.exports = Logger;
