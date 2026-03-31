/**
 * Settings Store
 * Manages user preferences persistence
 */

const fs = require('fs');
const path = require('path');

class SettingsStore {
  constructor(userId, dataDir, ephemeralSession = null) {
    this.userId = userId;
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, `${userId}.json`);
    this.defaultSettings = {
      model: 'deepseek-r1:8b',
      systemPrompt: 'You are a helpful assistant.',
      language: 'en',
      theme: 'light',
      verbosity: 'normal',
      notifications: 'all',
    };
    this.ephemeralSession = ephemeralSession;
    if (!this.ephemeralSession && !fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  async load() {
    if (this.ephemeralSession) {
      return { ...this.defaultSettings, ...this.ephemeralSession.settings };
    }
    if (!fs.existsSync(this.filePath)) {
      return { ...this.defaultSettings };
    }
    try {
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      return { ...this.defaultSettings, ...JSON.parse(raw) };
    } catch (err) {
      if (err instanceof SyntaxError || (err.message && err.message.includes('Unexpected token'))) {
        throw err;
      }
      throw new Error('Failed to load settings: ' + err.message);
    }
  }

  async save(settings) {
    const merged = { ...this.defaultSettings, ...settings };
    if (this.ephemeralSession) {
      this.ephemeralSession.settings = { ...settings };
      return merged;
    }
    await fs.promises.writeFile(this.filePath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  }

  async update(key, value) {
    const settings = await this.load();
    settings[key] = value;
    return this.save(settings);
  }

  async reset() {
    if (this.ephemeralSession) {
      this.ephemeralSession.settings = {};
      return { ...this.defaultSettings };
    }
    if (fs.existsSync(this.filePath)) {
      await fs.promises.unlink(this.filePath);
    }
    return { ...this.defaultSettings };
  }
}


module.exports = SettingsStore;
