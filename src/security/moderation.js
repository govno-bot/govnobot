/**
 * Moderation and Abuse Detection Module
 * AI-powered, configurable, with admin review queue.
 * Zero dependencies, Node.js built-ins only.
 */
const fs = require('fs');
const path = require('path');
const { FallbackChain } = require('../ai/fallback-chain');
// Use the shared storage file-lock utilities
const { withFileLock, readFileLocked, writeFileLocked } = require('../storage/file-lock');

const MOD_QUEUE_PATH = path.join(__dirname, '../../data/modqueue.json');
const MOD_CONFIG_PATH = path.join(__dirname, '../../data/moderation-config.json');

// Default moderation config
const DEFAULT_CONFIG = {
  enabled: true,
  aiPrompt: 'You are a strict moderation AI. Classify the following message as: OK, SPAM, TOXIC, NSFW, or ABUSE. Reply with only the label. Message:',
  flagCategories: ['SPAM', 'TOXIC', 'NSFW', 'ABUSE'],
  autoBlock: false,
  notifyAdmin: true
};

function loadConfig() {
  try {
    if (fs.existsSync(MOD_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(MOD_CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return DEFAULT_CONFIG;
}

function saveConfig(cfg) {
  fs.writeFileSync(MOD_CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function loadQueue() {
  try {
    if (fs.existsSync(MOD_QUEUE_PATH)) {
      return JSON.parse(fs.readFileSync(MOD_QUEUE_PATH, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveQueue(queue) {
  fs.writeFileSync(MOD_QUEUE_PATH, JSON.stringify(queue, null, 2));
}

/**
 * Moderate a message using AI and config.
 * Returns { result: 'OK'|'SPAM'|'TOXIC'|'NSFW'|'ABUSE', flagged: bool, queueId: string|null }
 */
async function moderateMessage({ userId, username, text, chatId, messageId }, fallbackChain) {
  const config = loadConfig();
  if (!config.enabled) return { result: 'OK', flagged: false, queueId: null };
  const prompt = `${config.aiPrompt}\n"${text}"`;
  let aiResult = 'OK';
  try {
    aiResult = (await fallbackChain.ask({ prompt })).trim().toUpperCase();
  } catch (e) {
    aiResult = 'OK'; // fallback to OK on AI error
  }
  const flagged = config.flagCategories.includes(aiResult);
  let queueId = null;
  if (flagged) {
    // Add to moderation queue
    const queue = loadQueue();
    queueId = `${Date.now()}_${userId}`;
    queue.push({
      id: queueId,
      userId,
      username,
      text,
      chatId,
      messageId,
      category: aiResult,
      reviewed: false,
      timestamp: Date.now()
    });
    saveQueue(queue);
  }
  return { result: aiResult, flagged, queueId };
}

function listQueue() {
  return loadQueue();
}

function reviewQueueItem(id, action) {
  const queue = loadQueue();
  const idx = queue.findIndex(q => q.id === id);
  if (idx === -1) return false;
  queue[idx].reviewed = true;
  queue[idx].reviewAction = action;
  saveQueue(queue);
  return true;
}

function clearReviewed() {
  let queue = loadQueue();
  queue = queue.filter(q => !q.reviewed);
  saveQueue(queue);
}

module.exports = {
  moderateMessage,
  listQueue,
  reviewQueueItem,
  clearReviewed,
  loadConfig,
  saveConfig
};
