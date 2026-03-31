/**
 * PinnedContextStore
 * Manages per-user pinned context messages
 */
const path = require('path');
const fs = require('fs');
const { writeFileLocked, readFileLocked, fileExists } = require('./file-lock');

class PinnedContextStore {
  constructor(dataDir = './data/pins') {
    this.dataDir = dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getPinsPath(chatId) {
    return path.join(this.dataDir, `${chatId}.json`);
  }

  async loadPins(chatId) {
    const filePath = this.getPinsPath(chatId);
    if (!fileExists(filePath)) return [];
    try {
      const content = await readFileLocked(filePath);
      const pins = JSON.parse(content);
      return Array.isArray(pins) ? pins : [];
    } catch {
      return [];
    }
  }

  async savePins(chatId, pins) {
    const filePath = this.getPinsPath(chatId);
    const content = JSON.stringify(pins, null, 2);
    await writeFileLocked(filePath, content);
  }

  async addPin(chatId, message) {
    const pins = await this.loadPins(chatId);
    pins.push(message);
    await this.savePins(chatId, pins);
  }

  async removePin(chatId, messageId) {
    let pins = await this.loadPins(chatId);
    pins = pins.filter(m => m.id !== messageId);
    await this.savePins(chatId, pins);
  }

  async clearPins(chatId) {
    const filePath = this.getPinsPath(chatId);
    if (fileExists(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

module.exports = PinnedContextStore;
