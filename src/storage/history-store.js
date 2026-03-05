/**
 * History Store
 * Manages user conversation history persistence
 */

const path = require('path');
const fs = require('fs');
const { writeFileLocked, readFileLocked, appendFileLocked, fileExists } = require('./file-lock');

class HistoryStore {
  constructor(dataDir = './data/history') {
    this.dataDir = dataDir;
    
    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get the history file path for a chat
   * @param {number} chatId - Telegram chat ID
   * @returns {string} - Path to history file
   */
  getHistoryPath(chatId) {
    return path.join(this.dataDir, `${chatId}.json`);
  }

  /**
   * Load conversation history for a user
   * @param {number} chatId - Telegram chat ID
   * @param {number} maxMessages - Max messages to return (default: all)
   * @returns {Promise<Array>} - Array of message objects
   */
  async loadHistory(chatId, maxMessages = null) {
    const filePath = this.getHistoryPath(chatId);
    if (!fileExists(filePath)) {
      return [];
    }
    try {
      const content = await readFileLocked(filePath);
      const messages = JSON.parse(content);
      if (!Array.isArray(messages)) {
        return [];
      }
      if (maxMessages && messages.length > maxMessages) {
        return messages.slice(-maxMessages);
      }
      return messages;
    } catch (error) {
      // Handle corrupted file gracefully (return empty array)
      return [];
    }
  }

  /**
   * Save conversation history for a user (overwrite)
   * @param {number} chatId - Telegram chat ID
   * @param {Array} messages - Array of message objects
   * @returns {Promise<void>}
   */
  async saveHistory(chatId, messages) {
    const filePath = this.getHistoryPath(chatId);
    const content = JSON.stringify(messages, null, 2);
    await writeFileLocked(filePath, content);
  }

  /**
   * Append a message to history
   * @param {number} chatId - Telegram chat ID
   * @param {object} message - Message object to append
   * @returns {Promise<void>}
   */
  async appendMessage(chatId, message) {
    const messages = await this.loadHistory(chatId);
    messages.push(message);
    await this.saveHistory(chatId, messages);
  }

  /**
   * Add a message to history
   * @param {number} chatId - Telegram chat ID
   * @param {string} role - Role (user, assistant, system)
   * @param {string} content - Message content
   * @returns {Promise<void>}
   */
  async addMessage(chatId, role, content) {
    if (!chatId || !role || !content) {
      throw new Error('chatId, role, and content are required');
    }
    
    if (!['user', 'assistant', 'system'].includes(role)) {
      throw new Error('Invalid role. Must be: user, assistant, or system');
    }
    
    const filePath = this.getHistoryPath(chatId);
    const timestamp = new Date().toISOString();
    
    const message = {
      timestamp,
      role,
      content,
    };
    
    try {
      // Load existing history
      let messages = [];
      if (fileExists(filePath)) {
        const content = await readFileLocked(filePath);
        messages = JSON.parse(content);
        
        if (!Array.isArray(messages)) {
          messages = [];
        }
      }
      
      // Add new message
      messages.push(message);
      
      // Save updated history
      const updated = JSON.stringify(messages, null, 2);
      await writeFileLocked(filePath, updated);
      
    } catch (error) {
      throw new Error(`Failed to add message to history: ${error.message}`);
    }
  }

  /**
   * Get context for AI (last N messages)
   * @param {number} chatId - Telegram chat ID
   * @param {number} contextSize - Number of messages to include
   * @returns {Promise<Array>} - Array of messages for context
   */
  async getContext(chatId, contextSize = 5) {
    const messages = await this.loadHistory(chatId);
    
    // Return last N messages, but exclude the very last user message
    // (since we're building context for the next response)
    if (messages.length > contextSize) {
      return messages.slice(-(contextSize + 1), -1);
    }
    
    return messages.slice(0, -1);
  }

  /**
   * Get formatted context string for AI prompt
   * @param {number} chatId - Telegram chat ID
   * @param {number} contextSize - Number of messages to include
   * @returns {Promise<string>} - Formatted conversation context
   */
  async getContextString(chatId, contextSize = 5) {
    const messages = await this.getContext(chatId, contextSize);
    
    if (messages.length === 0) {
      return '';
    }
    
    const contextLines = messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    });
    
    return contextLines.join('\n\n');
  }

  /**
   * Clear all history for a user
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<void>}
   */
  async clearHistory(chatId) {
    const filePath = this.getHistoryPath(chatId);
    
    if (fileExists(filePath)) {
      try {
        await new Promise((resolve, reject) => {
          fs.unlink(filePath, (error) => {
            if (error && error.code !== 'ENOENT') {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        throw new Error(`Failed to clear history: ${error.message}`);
      }
    }
  }

  /**
   * Get history statistics
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<object>} - Statistics
   */
  async getStats(chatId) {
    const messages = await this.loadHistory(chatId);
    
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    
    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      totalCharacters: totalLength,
      createdAt: messages.length > 0 ? messages[0].timestamp : null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
    };
  }

  /**
   * List all users with history
   * @returns {Promise<Array>} - Array of chat IDs that have history
   */
  async listUsers() {
    try {
      const files = fs.readdirSync(this.dataDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => parseInt(f.replace('.json', ''), 10))
        .filter(id => !isNaN(id));
    } catch (error) {
      return [];
    }
  }

  /**
   * Export all history as JSON
   * @param {number} chatId - Telegram chat ID (optional, if omitted export all)
   * @returns {Promise<object>} - Exported data
   */
  async export(chatId = null) {
    if (chatId) {
      return {
        chatId,
        messages: await this.loadHistory(chatId),
        stats: await this.getStats(chatId),
      };
    }
    
    // Export all users
    const users = await this.listUsers();
    const data = {};
    
    for (const id of users) {
      data[id] = {
        messages: await this.loadHistory(id),
        stats: await this.getStats(id),
      };
    }
    
    return {
      totalUsers: users.length,
      data,
    };
  }

  /**
   * Import history from backup
   * @param {object} data - Data to import
   * @returns {Promise<void>}
   */
  async import(data) {
    for (const [chatId, userData] of Object.entries(data)) {
      if (!Array.isArray(userData.messages)) {
        continue;
      }
      
      const filePath = this.getHistoryPath(chatId);
      const content = JSON.stringify(userData.messages, null, 2);
      await writeFileLocked(filePath, content);
    }
  }
}

module.exports = HistoryStore;
