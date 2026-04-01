/**
 * Telegram Bot API Client
 * HTTP client for Telegram Bot API
 * No external dependencies - uses native Node.js https module
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class TelegramAPIClient {
    /**
     * Send a document (file) to a chat
     * @param {number|string} chatId - Telegram chat ID
     * @param {string} document - File_id, HTTP URL, or base64 file (see Telegram API)
     * @param {object} options - Additional options (caption, parse_mode, etc.)
     * @returns {Promise<object>} - Response with sent message
     */
    async sendDocument(chatId, document, options = {}) {
      if (!chatId || !document) {
        throw new Error('chatId and document are required');
      }
      const params = {
        chat_id: chatId,
        document: document,
        ...options,
      };
      return this.request('POST', 'sendDocument', params);
    }
  constructor(botToken) {
    if (!botToken) {
      throw new Error('Bot token is required');
    }
    
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.requestTimeout = 60000; // 60 seconds (must be > long polling timeout)
  }

  /**
   * Make an HTTP request to Telegram API
   * @param {string} method - HTTP method (GET, POST)
   * @param {string} endpoint - API endpoint (e.g., 'getUpdates')
   * @param {object} params - Query/body parameters
   * @returns {Promise<object>} - Parsed JSON response
   */
  async request(method, endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}/${endpoint}`);
      
      let body = null;
      
      if (method === 'GET') {
        // Add params to query string
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.append(key, value);
          }
        });
      } else if (method === 'POST') {
        // Send params as JSON body
        body = JSON.stringify(params);
      }
      
      const options = {
        method: method,
        timeout: this.requestTimeout,
        headers: {},
      };
      
      if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }
      
      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (!jsonData.ok) {
              reject(new TelegramAPIError(
                jsonData.error_code || 0,
                jsonData.description || 'Unknown error'
              ));
            } else {
              resolve(jsonData);
            }
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (body) {
        req.write(body);
      }
      
      req.end();
    });
  }

  /**
   * Get updates from Telegram using long polling
   * @param {number} offset - Update offset
   * @param {number} timeout - Polling timeout in seconds
   * @returns {Promise<object>} - Response with updates
   */
  async getUpdates(offset = 0, timeout = 30) {
    return this.request('POST', 'getUpdates', {
      offset: offset,
      timeout: timeout,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  /**
   * Send a message to a chat
   * @param {number} chatId - Telegram chat ID
   * @param {string} text - Message text
   * @param {object} options - Additional options (parse_mode, etc.)
   * @returns {Promise<object>} - Response with sent message
   */
  async sendMessage(chatId, text, options = {}) {
    if (!chatId || !text) {
      throw new Error('chatId and text are required');
    }
    
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: true,
      ...options,
    };
    
    return this.request('POST', 'sendMessage', params);
  }

  /**
   * Send a photo to a chat
   * @param {number|string} chatId - Telegram chat ID
   * @param {string} photo - Photo URL or file_id
   * @param {object} options - Additional options (caption, parse_mode, etc.)
   * @returns {Promise<object>} - Response with sent message
   */
  async sendPhoto(chatId, photo, options = {}) {
    if (!chatId || !photo) {
      throw new Error('chatId and photo are required');
    }
    
    const params = {
      chat_id: chatId,
      photo: photo,
      ...options,
    };
    
    return this.request('POST', 'sendPhoto', params);
  }

  /**
   * Edit an existing message
   * @param {number} chatId - Telegram chat ID
   * @param {number} messageId - ID of message to edit
   * @param {string} text - New message text
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Response with edited message
   */
  async editMessage(chatId, messageId, text, options = {}) {
    if (!chatId || !messageId || !text) {
      throw new Error('chatId, messageId and text are required');
    }
    
    const params = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: true,
      ...options,
    };
    
    return this.request('POST', 'editMessageText', params);
  }

  /**
   * Delete a message
   * @param {number} chatId - Telegram chat ID
   * @param {number} messageId - ID of message to delete
   * @returns {Promise<object>} - Response
   */
  async deleteMessage(chatId, messageId) {
    if (!chatId || !messageId) {
      throw new Error('chatId and messageId are required');
    }
    return this.request('POST', 'deleteMessage', { chat_id: chatId, message_id: messageId });
  }

  /**
   * Get file info containing file_path
   * @param {string} fileId - The file ID
   * @returns {Promise<object>} - File info
   */
  async getFile(fileId) {
    if (!fileId) throw new Error('fileId is required');
    return this.request('POST', 'getFile', { file_id: fileId });
  }

  /**
   * Download file to a Buffer
   * @param {string} filePath - The path from getFile
   * @returns {Promise<Buffer>} - Downloaded file content
   */
  async downloadFile(filePath) {
    if (!filePath) throw new Error('filePath is required');
    const url = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download file, status code: ${res.statusCode}`));
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Send chat action (typing, upload_photo, etc.)
   * @param {number} chatId - Telegram chat ID
   * @param {string} action - Action type
   * @returns {Promise<object>} - Response
   */
  async sendChatAction(chatId, action = 'typing') {
    if (!chatId) {
      throw new Error('chatId is required');
    }
    
    return this.request('POST', 'sendChatAction', {
      chat_id: chatId,
      action: action,
    });
  }

  /**
   * Get information about the bot
   * @returns {Promise<object>} - Bot info (id, username, first_name)
   */
  async getMe() {
    return this.request('POST', 'getMe');
  }

  /**
   * Set webhook URL for updates
   * @param {string} url - Webhook URL
   * @returns {Promise<object>} - Response
   */
  async setWebhook(url) {
    if (!url) {
      throw new Error('url is required');
    }
    
    return this.request('POST', 'setWebhook', {
      url: url,
      drop_pending_updates: false,
    });
  }

  /**
   * Delete webhook
   * @returns {Promise<object>} - Response
   */
  async deleteWebhook() {
    return this.request('POST', 'deleteWebhook', {
      drop_pending_updates: false,
    });
  }

  /**
   * Get webhook info
   * @returns {Promise<object>} - Webhook info
   */
  async getWebhookInfo() {
    return this.request('POST', 'getWebhookInfo');
  }

  /**
   * Set bot commands menu
   * @param {Array} commands - Array of command objects [{command: string, description: string}]
   * @returns {Promise<object>} - Response
   */
  async setMyCommands(commands) {
    if (!Array.isArray(commands)) {
      throw new Error('commands must be an array');
    }
    
    return this.request('POST', 'setMyCommands', {
      commands: commands,
    });
  }
}

/**
 * Custom error class for Telegram API errors
 */
class TelegramAPIError extends Error {
  constructor(code, description) {
    super(description);
    this.name = 'TelegramAPIError';
    this.code = code;
  }
}

module.exports = TelegramAPIClient;
module.exports.TelegramAPIError = TelegramAPIError;
