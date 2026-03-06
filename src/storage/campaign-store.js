const fs = require('fs');
const path = require('path');
const { readFileLocked, writeFileLocked } = require('./file-lock');

class CampaignStore {
  constructor(userId, dataDir) {
    this.userId = userId;
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, `${userId}.json`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  async load() {
    if (!fs.existsSync(this.filePath)) return { activeCampaign: null, history: [] };
    try {
      const data = await readFileLocked(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
         return { activeCampaign: null, history: [] };
      }
      return { activeCampaign: null, history: [] };
    }
  }

  async save(state) {
    await writeFileLocked(this.filePath, JSON.stringify(state, null, 2), 'utf8');
  }
}

module.exports = CampaignStore;