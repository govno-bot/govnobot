// Backup Manager: Manages creation, listing, and restoration of data backups
// Node.js built-in modules only. No external dependencies.
const fs = require('fs');
const path = require('path');
const FileLock = require('./file-lock');

class BackupManager {
  constructor({ backupDir, dataDir, userId, maxBackups = 10 }) {
    this.backupDir = backupDir;
    this.dataDir = dataDir;
    this.userId = userId;
    this.maxBackups = maxBackups;
    this.lock = new FileLock(path.join(backupDir, 'backup.lock'));
  }

  async createBackup() {
    await this.lock.acquire();
    try {
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
      const backupName = `backup_${ts}`;
      const backupPath = path.join(this.backupDir, backupName);
      await fs.promises.mkdir(backupPath, { recursive: true });
      await this._copyDir(this.dataDir, backupPath);
      await this._cleanupOldBackups();
      return backupName;
    } finally {
      await this.lock.release();
    }
  }

  async listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    const entries = await fs.promises.readdir(this.backupDir, { withFileTypes: true });
    const backups = entries.filter(e => e.isDirectory() && /^backup_\d{8}_\d{6}$/.test(e.name))
      .map(e => ({
        name: e.name,
        timestamp: this._parseTimestamp(e.name)
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    return backups;
  }

  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup '${backupName}' not found`);
    }
    // Remove current dataDir
    if (fs.existsSync(this.dataDir)) {
      await fs.promises.rm(this.dataDir, { recursive: true, force: true });
    }
    await this._copyDir(backupPath, this.dataDir);
  }

  async _copyDir(src, dest) {
    const stat = await fs.promises.stat(src);
    if (!stat.isDirectory()) throw new Error('Source is not a directory');
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this._copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  async _cleanupOldBackups() {
    const backups = await this.listBackups();
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      for (const b of toDelete) {
        await fs.promises.rm(path.join(this.backupDir, b.name), { recursive: true, force: true });
      }
    }
  }

  _parseTimestamp(name) {
    // backup_YYYYMMDD_HHMMSS
    const m = /^backup_(\d{8})_(\d{6})$/.exec(name);
    if (!m) return 0;
    const [_, date, time] = m;
    const y = date.slice(0, 4), mo = date.slice(4, 6), d = date.slice(6, 8);
    const h = time.slice(0, 2), mi = time.slice(2, 4), s = time.slice(4, 6);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).getTime();
  }
}

module.exports = BackupManager;
