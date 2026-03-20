// src/ai/metrics.js
// Simple zero-dependency metrics collector for AI providers
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');

class Metrics extends EventEmitter {
  constructor() {
    super();
    this._data = { providers: {} };
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(METRICS_FILE)) {
        const raw = fs.readFileSync(METRICS_FILE, 'utf8');
        this._data = JSON.parse(raw || '{}');
      }
    } catch (err) {
      // swallow errors to avoid crashing on metrics load
      this._data = { providers: {} };
    }
  }

  _save() {
    try {
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this._data, null, 2), 'utf8');
    } catch (err) {
      // ignore persistence errors
    }
  }

  _ensureProvider(p) {
    if (!this._data.providers) this._data.providers = {};
    if (!this._data.providers[p]) {
      this._data.providers[p] = { calls: 0, errors: 0, totalLatencyMs: 0, cost: 0, samples: [] };
    }
    return this._data.providers[p];
  }

  record(provider, { latencyMs = 0, error = false, cost = 0, model = null } = {}) {
    const p = String(provider || 'unknown');
    const entry = this._ensureProvider(p);
    entry.calls += 1;
    if (error) entry.errors += 1;
    entry.totalLatencyMs += Number(latencyMs) || 0;
    entry.cost += Number(cost) || 0;
    const sample = { ts: new Date().toISOString(), latencyMs: Number(latencyMs) || 0, error: !!error, cost: Number(cost) || 0 };
    if (model) sample.model = model;
    entry.samples = entry.samples || [];
    entry.samples.push(sample);
    // Trim samples to keep file small
    if (entry.samples.length > 500) entry.samples.splice(0, entry.samples.length - 500);
    this._save();
    this.emit('metrics', { provider: p, sample, summary: entry });
  }

  getProvider(provider) {
    return this._data.providers && this._data.providers[provider] ? this._data.providers[provider] : null;
  }

  getSnapshot() {
    // Return shallow copy
    return JSON.parse(JSON.stringify(this._data));
  }
}

module.exports = new Metrics();
