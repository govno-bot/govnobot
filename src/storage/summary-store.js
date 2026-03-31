/**
 * SummaryStore
 * Manages per-user conversation summaries
 */
const path = require('path');
const fs = require('fs');
const { writeFileLocked, readFileLocked, fileExists } = require('./file-lock');

class SummaryStore {
  constructor(dataDir = './data/summary') {
    this.dataDir = dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getSummaryPath(chatId) {
    return path.join(this.dataDir, `${chatId}.json`);
  }

  async loadSummary(chatId) {
    const filePath = this.getSummaryPath(chatId);
    if (!fileExists(filePath)) return null;
    try {
      const content = await readFileLocked(filePath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveSummary(chatId, summary) {
    const filePath = this.getSummaryPath(chatId);
    const content = JSON.stringify(summary, null, 2);
    await writeFileLocked(filePath, content);
  }

  async clearSummary(chatId) {
    const filePath = this.getSummaryPath(chatId);
    if (fileExists(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

module.exports = SummaryStore;
