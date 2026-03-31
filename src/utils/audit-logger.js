// src/utils/audit-logger.js
// Simple audit logger for plugin execution events
const fs = require('fs');
const path = require('path');

class AuditLogger {
    constructor(filePath) {
        this.filePath = filePath || path.join(__dirname, '../../govnobot_logs/audit.log');
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    log(event) {
        const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + '\n';
        fs.appendFileSync(this.filePath, line, 'utf8');
    }
}

module.exports = AuditLogger;
