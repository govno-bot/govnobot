/**
 * Notepad Store
 * Provides persistent memory for the bot's thoughts, goals, and planned actions.
 */

const fs = require('fs');
const path = require('path');
const { readFileLocked, writeFileLocked, deleteFileLocked } = require('./file-lock');

class NotepadStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'notepad.json');
    this.defaultData = {
      thoughts: "",
      goals: [],
      planned_actions: [],
      notes: ""
    };
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  async load() {
    if (!fs.existsSync(this.filePath)) {
      return { ...this.defaultData };
    }
    try {
      const raw = await readFileLocked(this.filePath);
      return { ...this.defaultData, ...JSON.parse(raw) };
    } catch (err) {
      if (err instanceof SyntaxError || (err.message && err.message.includes('Unexpected token'))) {
        throw err;
      }
      throw new Error(`Failed to load notepad: ${err.message}`);
    }
  }

  async save(data) {
    const merged = { ...this.defaultData, ...data };
    await writeFileLocked(this.filePath, JSON.stringify(merged, null, 2));
    return merged;
  }

  async update(updates) {
    const current = await this.load();
    const merged = { ...current, ...updates };
    return this.save(merged);
  }

  async clear() {
    if (fs.existsSync(this.filePath)) {
      await deleteFileLocked(this.filePath);
    }
    return { ...this.defaultData };
  }
}

module.exports = NotepadStore;
