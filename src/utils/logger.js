/**
 * Logger Module - Structured Logging (Zero Dependencies)
 * Supports multiple log levels, file and console output, JSON formatting
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Log levels (lower number = more severe)
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  /**
   * Create a logger instance
   * @param {Object} options - Configuration options
   * @param {string} options.level - Minimum log level (debug, info, warn, error)
   * @param {boolean} options.console - Log to console (default: true)
   * @param {boolean} options.file - Log to file (default: false)
   * @param {string} options.filePath - Path to log file
   * @param {string} options.format - Log format: 'text' or 'json' (default: 'text')
   */
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.console = options.console !== undefined ? options.console : true;
    this.file = options.file || false;
    this.filePath = options.filePath || './data/bot.log';
    this.format = options.format || 'text';
    
    this.fileStream = null;
    
    // Open file stream if needed
    if (this.file && this.filePath) {
      this._openFileStream();
    }
  }
  
  /**
   * Open file stream for writing
   * @private
   */
  _openFileStream() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Open file in append mode
      this.fileStream = fs.createWriteStream(this.filePath, { flags: 'a' });
    } catch (error) {
      console.error('Failed to open log file:', error.message);
      this.file = false;
    }
  }
  
  /**
   * Check if level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} True if should log
   * @private
   */
  _shouldLog(level) {
    const currentLevel = LEVELS[this.level] || 1;
    const messageLevel = LEVELS[level] || 1;
    return messageLevel >= currentLevel;
  }
  
  /**
   * Format log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional data
   * @returns {string} Formatted log entry
   * @private
   */
  _format(level, message, metadata) {
    const timestamp = new Date().toISOString();
    
    if (this.format === 'json') {
      const entry = {
        timestamp,
        level,
        message,
        ...metadata
      };
      return JSON.stringify(entry);
    }
    
    // Text format
    let formatted = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Add metadata if present
    if (metadata && Object.keys(metadata).length > 0) {
      formatted += ' ' + JSON.stringify(metadata);
    }
    
    return formatted;
  }
  
  /**
   * Write log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object|Error} metadata - Additional data or Error object
   * @private
   */
  _log(level, message, metadata = {}) {
    if (!this._shouldLog(level)) {
      return;
    }
    
    // Handle Error objects
    if (metadata instanceof Error) {
      metadata = {
        error: metadata.message,
        stack: metadata.stack
      };
    }
    
    const formatted = this._format(level, message, metadata);
    
    // Console output
    if (this.console) {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : 
                           console.log;
      consoleMethod(formatted);
    }
    
    // File output
    if (this.file && this.fileStream) {
      this.fileStream.write(formatted + '\n');
    }
  }
  
  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {Object|Error} metadata - Additional data
   */
  debug(message, metadata) {
    this._log('debug', message, metadata);
  }
  
  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object|Error} metadata - Additional data
   */
  info(message, metadata) {
    this._log('info', message, metadata);
  }
  
  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object|Error} metadata - Additional data
   */
  warn(message, metadata) {
    this._log('warn', message, metadata);
  }
  
  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Object|Error} metadata - Additional data or Error object
   */
  error(message, metadata) {
    this._log('error', message, metadata);
  }
  
  /**
   * Close logger and file stream
   */
  close() {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }
}

/**
 * Create a default logger instance (singleton)
 */
let defaultLogger = null;

function getLogger(options) {
  if (!defaultLogger) {
    defaultLogger = new Logger(options);
  }
  return defaultLogger;
}

module.exports = Logger;
module.exports.getLogger = getLogger;
module.exports.LEVELS = LEVELS;
