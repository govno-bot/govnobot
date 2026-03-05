#!/usr/bin/env node

/**
 * GovnoBot - Telegram Bot for ultimate vibecoding experience
 * Experimental project - Single file, zero dependencies Node.js port
 * Version: 2.3.1 (Node.js)
 * 
 * Features:
 * - Telegram polling with exponential backoff
 * - Conversation history per user (in-memory + file persistence)
 * - User settings (custom prompts, model selection)
 * - Rate limiting (per-minute and per-hour)
 * - Response caching (24-hour TTL)
 * - Message chunking (Telegram 4096 char limit)
 * - Statistics tracking
 * - Admin commands with verification
 * - AI fallback chain (Ollama → Copilot CLI → OpenAI → Error)
 * 
 * No external dependencies - uses Node.js native APIs only
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  botToken: process.env.TELEGRAM_GOVNOBOT_TOKEN,
  adminUsername: process.env.TELEGRAM_GOVNOBOT_ADMIN_USERNAME,
  adminChatId: parseInt(process.env.TELEGRAM_GOVNOBOT_ADMIN_CHATID || '0'),
  pollInterval: 30000, // 30 seconds
  ollamaUrl: 'http://localhost:11434/api/generate',
  ollamaModel: 'qwen3-coder:30b',
  availableModels: ['deepseek-r1:8b', 'qwen3-coder:30b'],
  version: '2.3.1',
  versionDate: '2026-01-05',
  rateLimitPerMinute: 10,
  rateLimitPerHour: 100,
};

// Parse command line arguments
const args = process.argv.slice(2);
const noLoop = args.includes('-NoLoop') || args.includes('--no-loop');
const noLamma = args.includes('-NoLamma') || args.includes('--no-lamma');
const debug = args.includes('-Debug') || args.includes('--debug');

// Whitelist for admin shell commands
const ADMIN_COMMAND_WHITELIST = [
  'get-process', 'get-service', 'get-childitem', 'get-item',
  'get-content', 'test-path', 'whoami', 'hostname', 'ipconfig',
  // Common aliases
  'dir', 'ls', 'cat'
];

const DISALLOWED_METACHARS = ['`', ';', '|', '&&', '&', '>', '<'];

const isAdminCommandAllowed = (cmd) => {
  if (!cmd || typeof cmd !== 'string') return false;
  const lower = cmd.trim().toLowerCase();
  for (const sym of DISALLOWED_METACHARS) {
    if (lower.includes(sym)) return false;
  }
  const firstToken = lower.split(/\s+/)[0];
  return ADMIN_COMMAND_WHITELIST.includes(firstToken);
};

// ============================================================================
// State Management
// ============================================================================

const state = {
  lastUpdateId: 0,
  conversationHistory: {}, // chatId -> array of {timestamp, role, content}
  userSettings: {},        // chatId -> {model, systemPrompt, maxHistoryContext}
  rateLimits: {},          // chatId -> {minuteCount, minuteResetTime, hourCount, hourResetTime}
  stats: {
    totalPrompts: 0,
    totalCommands: 0,
    commandCounts: {},
    startTime: Date.now(),
    lastActivity: Date.now(),
  },
  baseUrl: `https://api.telegram.org/bot${CONFIG.botToken}`,
  dataDir: path.join(__dirname, 'govnobot_data'),
  historyDir: null,
  settingsDir: null,
  cacheDir: null,
};

// Initialize directories
const initDirectories = () => {
  state.historyDir = path.join(state.dataDir, 'history');
  state.settingsDir = path.join(state.dataDir, 'settings');
  state.cacheDir = path.join(state.dataDir, 'cache');

  for (const dir of [state.dataDir, state.historyDir, state.settingsDir, state.cacheDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

// ============================================================================
// Logging
// ============================================================================

const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const logMsg = `[${timestamp}] [${level}] ${message}`;
  console.log(logMsg);

  if (debug) {
    fs.appendFileSync(path.join(__dirname, 'govnobot.log'), logMsg + '\n');
  }
};

// Admin audit logging
const logAdminAction = (username, chatId, command) => {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const entry = `[${timestamp}] @${username} (${chatId}): ${command}`;
    const auditFile = path.join(state.dataDir, 'admin_audit.log');
    fs.appendFileSync(auditFile, entry + '\n');
  } catch (error) {
    log(`Failed to write admin audit entry: ${error.message}`, 'WARN');
  }
};

// ============================================================================
// File Utilities
// ============================================================================

const getHistoryFile = (chatId) => path.join(state.historyDir, `${chatId}.json`);
const getSettingsFile = (chatId) => path.join(state.settingsDir, `${chatId}.json`);

const safeReadJSON = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    log(`Failed to read JSON from ${filePath}: ${error.message}`, 'WARN');
  }
  return null;
};

const safeWriteJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    log(`Failed to write JSON to ${filePath}: ${error.message}`, 'WARN');
    return false;
  }
};

// ============================================================================
// History Management
// ============================================================================

const getConversationHistory = (chatId, limit = 10) => {
  // Try in-memory cache first
  if (state.conversationHistory[chatId]) {
    return state.conversationHistory[chatId].slice(-limit);
  }

  // Load from file
  const historyFile = getHistoryFile(chatId);
  const history = safeReadJSON(historyFile);

  if (history && Array.isArray(history)) {
    state.conversationHistory[chatId] = history;
    return history.slice(-limit);
  }

  return [];
};

const addToHistory = (chatId, role, content) => {
  const entry = {
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    role,
    content,
  };

  if (!state.conversationHistory[chatId]) {
    state.conversationHistory[chatId] = [];
  }

  state.conversationHistory[chatId].push(entry);

  // Keep max 100 entries
  if (state.conversationHistory[chatId].length > 100) {
    state.conversationHistory[chatId] = state.conversationHistory[chatId].slice(-100);
  }

  // Persist to file
  const historyFile = getHistoryFile(chatId);
  safeWriteJSON(historyFile, state.conversationHistory[chatId]);
};

// ============================================================================
// Settings Management
// ============================================================================

const getUserSettings = (chatId) => {
  // Try in-memory cache
  if (state.userSettings[chatId]) {
    return state.userSettings[chatId];
  }

  // Load from file
  const settingsFile = getSettingsFile(chatId);
  const settings = safeReadJSON(settingsFile);

  if (settings) {
    state.userSettings[chatId] = settings;
    return settings;
  }

  // Return defaults
  const defaults = {
    model: CONFIG.ollamaModel,
    systemPrompt: 'You are a helpful assistant.',
    maxHistoryContext: 5,
  };

  state.userSettings[chatId] = defaults;
  return defaults;
};

const saveUserSettings = (chatId, settings) => {
  state.userSettings[chatId] = settings;
  const settingsFile = getSettingsFile(chatId);
  safeWriteJSON(settingsFile, settings);
};

// ============================================================================
// Rate Limiting
// ============================================================================

const checkRateLimit = (chatId) => {
  const now = Date.now();

  if (!state.rateLimits[chatId]) {
    state.rateLimits[chatId] = {
      minuteCount: 0,
      minuteResetTime: now + 60000,
      hourCount: 0,
      hourResetTime: now + 3600000,
    };
  }

  const limit = state.rateLimits[chatId];

  // Reset minute counter if needed
  if (now > limit.minuteResetTime) {
    limit.minuteCount = 0;
    limit.minuteResetTime = now + 60000;
  }

  // Reset hour counter if needed
  if (now > limit.hourResetTime) {
    limit.hourCount = 0;
    limit.hourResetTime = now + 3600000;
  }

  // Check limits
  if (limit.minuteCount >= CONFIG.rateLimitPerMinute) {
    const resetIn = (limit.minuteResetTime - now) / 1000;
    return { allowed: false, reason: 'Minute limit exceeded', resetIn };
  }

  if (limit.hourCount >= CONFIG.rateLimitPerHour) {
    const resetIn = (limit.hourResetTime - now) / 1000;
    return { allowed: false, reason: 'Hour limit exceeded', resetIn };
  }

  // Increment counters
  limit.minuteCount++;
  limit.hourCount++;

  return { allowed: true };
};

// ============================================================================
// Caching
// ============================================================================

const getCachedResponse = (prompt, model) => {
  const hash = crypto.createHash('md5').update(`${model}|${prompt}`).digest('hex').slice(0, 16);
  const cacheFile = path.join(state.cacheDir, `${hash}.cache`);

  const cached = safeReadJSON(cacheFile);
  if (cached && cached.timestamp) {
    const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
    const cacheAgeHours = cacheAge / (1000 * 60 * 60);

    if (cacheAgeHours < 24) {
      log(`Cache hit for prompt hash ${hash}`, 'DEBUG');
      return cached.response;
    }
  }

  return null;
};

const saveCachedResponse = (prompt, model, response) => {
  const hash = crypto.createHash('md5').update(`${model}|${prompt}`).digest('hex').slice(0, 16);
  const cacheFile = path.join(state.cacheDir, `${hash}.cache`);

  const cacheEntry = {
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    response,
  };

  safeWriteJSON(cacheFile, cacheEntry);
  log(`Cached response with hash ${hash}`, 'DEBUG');
};

// ============================================================================
// Telegram API
// ============================================================================

const sendTelegramMessage = (chatId, text, parseMode = 'Markdown') => {
  return new Promise((resolve, reject) => {
    const maxLength = 4000;

    const sendChunk = (chunk) => {
      return new Promise((chunkResolve, chunkReject) => {
        const body = JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: parseMode,
        });

        const url = new URL(state.baseUrl + '/sendMessage');
        const options = {
          method: 'POST',
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              chunkResolve(JSON.parse(data));
            } catch {
              chunkResolve({ ok: true });
            }
          });
        });

        req.on('error', chunkReject);
        req.write(body);
        req.end();
      });
    };

    if (text.length > maxLength) {
      // Split into chunks
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.slice(i, i + maxLength));
      }

      // Send chunks sequentially
      (async () => {
        try {
          let lastResponse;
          for (const chunk of chunks) {
            lastResponse = await sendChunk(chunk);
            await new Promise(r => setTimeout(r, 500)); // Rate limiting
          }
          resolve(lastResponse);
        } catch (error) {
          reject(error);
        }
      })();
    } else {
      sendChunk(text).then(resolve).catch(reject);
    }
  });
};

const getTelegramUpdates = (offset = 0) => {
  return new Promise((resolve, reject) => {
    const url = new URL(state.baseUrl + `/getUpdates?offset=${offset}&timeout=90`);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname + url.search,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ ok: false, result: [] });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// ============================================================================
// AI Integrations
// ============================================================================

const invokeOllama = (prompt, systemPrompt = '', model = CONFIG.ollamaModel) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      prompt,
      system: systemPrompt,
      stream: false,
    });

    log(`Calling Ollama with model '${model}' and prompt: ${prompt.slice(0, 50)}...`, 'DEBUG');

    const url = new URL(CONFIG.ollamaUrl);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.response);
        } catch {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120000);
    req.write(body);
    req.end();
  });
};

const invokeAIFallback = (prompt, systemPrompt, chatId) => {
  // In Node.js, we can't easily call shell commands like PowerShell version
  // For now, return error message with setup instructions
  return Promise.resolve({
    success: false,
    message: `❌ No AI backend available in NoLamma mode.\n\n` +
      `**Available options:**\n` +
      `1. Update GitHub CLI: \`gh agent-task create <task>\` (recommended)\n` +
      `2. Install GitHub Copilot CLI: https://github.com/github/copilot-cli\n` +
      `3. Set environment variable: \`OPENAI_API_KEY=sk-...\`\n` +
      `4. Run bot without \`-NoLamma\` flag to use local Ollama\n\n` +
      `_Note: Older \`gh copilot\` extensions have been deprecated._`,
  });
};

// ============================================================================
// Admin Verification
// ============================================================================

const restrictToAdmin = (message) => {
  const username = message.from.username || '';
  const chatId = message.chat.id;

  const adminUserConfigured = !!(CONFIG.adminUsername && CONFIG.adminUsername.trim());
  const adminChatConfigured = !!CONFIG.adminChatId && CONFIG.adminChatId !== 0;

  const isAdminByUser = adminUserConfigured && username && CONFIG.adminUsername.toLowerCase() === username.toLowerCase();
  const isAdminByChat = adminChatConfigured && CONFIG.adminChatId === chatId;

  let granted = false;
  if (adminUserConfigured && adminChatConfigured) {
    granted = isAdminByUser && isAdminByChat;
  } else if (adminUserConfigured) {
    granted = isAdminByUser;
  } else if (adminChatConfigured) {
    granted = isAdminByChat;
  } else {
    granted = false; // No admin configured -> deny by default
  }

  if (granted) {
    log(`Admin access granted for @${username} (chat: ${chatId})`);
    return true;
  }

  if (!adminUserConfigured && !adminChatConfigured) {
    log(`Admin restrictions active but no admin configured; denying access for @${username} (chat: ${chatId})`, 'WARN');
  } else {
    log(`Access denied for @${username} (chat: ${chatId})`, 'WARN');
  }
  sendTelegramMessage(chatId, '⛔ Access denied. This command is restricted to administrators.');
  return false;
};

// ============================================================================
// Command Handlers
// ============================================================================

const handleCommand = async (message) => {
  const chatId = message.chat.id;
  const text = message.text;
  const username = message.from.username || 'unknown';

  log(`Processing command '${text}' from @${username} (chat: ${chatId})`);

  // Update statistics
  state.stats.totalCommands++;
  state.stats.lastActivity = Date.now();

  // Extract command name for stats
  const cmdMatch = text.match(/^\/([a-zA-Z]+)/);
  if (cmdMatch) {
    const commandName = cmdMatch[1];
    if (!state.stats.commandCounts[commandName]) {
      state.stats.commandCounts[commandName] = 0;
    }
    state.stats.commandCounts[commandName]++;
  }

  // Command handlers
  if (text.match(/^\/start/)) {
    const welcomeText = `🤖 **Welcome to GovnoBot**\n\n` +
      `Your experimental vibecoding assistant powered by AI.\n\n` +
      `⚠️ _This is an experimental system - no guarantees of stability or accuracy._\n\n` +
      `**Available Commands:**\n\n` +
      `/ask [question] - Ask AI a question (admin)\n` +
      `/fix [error/code] - Debug and fix issues (admin)\n` +
      `/chain [steps] - Multi-step AI pipeline (admin)\n` +
      `/agent [task] - Complex task execution (admin)\n` +
      `/ping - Check bot responsiveness\n` +
      `/time - Current server time\n` +
      `/stats - Bot statistics\n` +
      `/status - Bot health status\n` +
      `/history [n] - Show last n messages (default: 5)\n` +
      `/model [name] - Switch AI model (llama2, mistral, neural-chat)\n` +
      `/settings - Show your settings\n` +
      `/sh [command] - Execute shell command (admin)\n` +
      `/jack [text] - Sends a message to Jack via Facebook (admin)\n` +
      `/dev - Self-improvement mode (admin)\n` +
      `/version - Bot version info\n` +
      `/help - Detailed help\n\n` +
      `_This bot is experimental and may behave unpredictably._`;
    await sendTelegramMessage(chatId, welcomeText);
  } else if (text.match(/^\/version/)) {
    const versionText = `🤖 **GovnoBot v${CONFIG.version}**\n\n` +
      `📅 Release Date: ${CONFIG.versionDate}\n` +
      `🧠 AI Model: ${CONFIG.ollamaModel}\n` +
      `🔗 Ollama URL: ${CONFIG.ollamaUrl}\n\n` +
      `**Recent Updates:**\n` +
      `• ✅ Node.js port with zero dependencies\n` +
      `• ✅ Implemented /fix command for debugging\n` +
      `• ✅ Implemented /agent mode for complex tasks\n` +
      `• ✅ Added real-time statistics tracking\n` +
      `• ✅ Improved admin security\n` +
      `• ✅ Added message chunking for long responses\n\n` +
      `_Built by AI, for AI_`;
    await sendTelegramMessage(chatId, versionText);
  } else if (text.match(/^\/help/)) {
    const helpText = `🤖 **GovnoBot Help**\n\n` +
      `This bot implements an experimental 'Hive AI' concept:\n` +
      `• Questions are processed by LLMs with different moods\n` +
      `• Can integrate with local Ollama or VS Code Copilot\n` +
      `• Admin commands for system control\n` +
      `• Self-improvement capabilities via /dev\n\n` +
      `**Available Commands:**\n\n` +
      `/ask [question] - Ask AI a question\n` +
      `/fix [error/code] - Debug and fix issues\n` +
      `/chain [steps] - Multi-step AI pipeline\n` +
      `/agent [task] - Complex task execution\n` +
      `/ping - Check bot responsiveness\n` +
      `/time - Current server time\n` +
      `/stats - Bot statistics\n` +
      `/status - Bot health status\n` +
      `/history [n] - Show conversation history\n` +
      `/model [name] - Switch AI model\n` +
      `/settings - Show/modify settings\n` +
      `/sh [command] - Execute shell command (admin)\n` +
      `/jack [text] - Send Facebook message (admin)\n` +
      `/dev - Self-improvement mode (admin)\n` +
      `/version - Bot version info\n\n` +
      `💡 **Tips:**\n` +
      `• Be specific in your questions for better answers\n` +
      `• /fix works best with error messages or code snippets\n` +
      `• /agent mode is powerful but admin-only`;
    await sendTelegramMessage(chatId, helpText);
  } else if (text.match(/^\/time/)) {
    const now = new Date();
    const timeText = `🕐 **Current Time**\n\n` +
      `Local: ${now.toLocaleTimeString()}\n` +
      `Full: ${now.toISOString().replace('T', ' ').slice(0, 19)}`;
    await sendTelegramMessage(chatId, timeText);
  } else if (text.match(/^\/ping/)) {
    const startTime = Date.now();
    await sendTelegramMessage(chatId, '🏓 Pong! Bot is responsive.');
    const latency = Date.now() - startTime;
    log(`Ping latency: ${latency}ms`, 'DEBUG');
  } else if (text.match(/^\/status/)) {
    const uptime = Math.floor((Date.now() - state.stats.startTime) / 1000);
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = noLoop ? 'N/A (NoLoop flag is set)' : `${days}d ${hours}h ${minutes}m`;

    let ollamaStatus = '❌ Not connected';
    if (!noLamma) {
      try {
        await invokeOllama('test', '', CONFIG.ollamaModel);
        ollamaStatus = '✅ Connected';
      } catch {
        ollamaStatus = '⚠️ Unavailable (using fallback)';
      }
    } else {
      ollamaStatus = '🚫 Disabled (NoLamma mode)';
    }

    const statusText = `🤖 **Bot Status**\n\n` +
      `⏱️ Uptime: ${uptimeStr}\n` +
      `🧠 AI Backend: ${ollamaStatus}\n` +
      `📝 Commands Processed: ${state.stats.totalCommands}\n` +
      `🎯 Last Update ID: ${state.lastUpdateId}\n` +
      `⏲️ Poll Interval: ${CONFIG.pollInterval / 1000}s\n\n` +
      `_All systems operational_ ✅`;
    await sendTelegramMessage(chatId, statusText);
  } else if (text.match(/^\/ask/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/ask');

    const question = text.replace(/^\/ask\s*/, '');
    if (!question) {
      await sendTelegramMessage(chatId, 'Usage: /ask [your question]\n\nExample: /ask What is the capital of France?');
      return;
    }

    const rateLimitCheck = checkRateLimit(chatId);
    if (!rateLimitCheck.allowed) {
      const resetMin = Math.ceil(rateLimitCheck.resetIn / 60);
      await sendTelegramMessage(chatId, `⏱️ **Rate limit exceeded**\n\nYou've hit the ${rateLimitCheck.reason}.\n\nTry again in ~${resetMin} minute(s).`);
      log(`Rate limit hit for chat ${chatId} - ${rateLimitCheck.reason}`, 'WARN');
      return;
    }

    state.stats.totalPrompts++;
    const settings = getUserSettings(chatId);

    // Add to history
    addToHistory(chatId, 'user', question);

    // Get conversation context
    const conversationHistory = getConversationHistory(chatId, settings.maxHistoryContext);
    let contextStr = '';
    for (let i = 0; i < conversationHistory.length - 1; i++) {
      const entry = conversationHistory[i];
      const role = entry.role === 'user' ? 'User' : 'Assistant';
      contextStr += `[${role}]: ${entry.content}\n`;
    }

    const enrichedPrompt = contextStr && contextStr.length > 0
      ? `Context: ${contextStr}\nNew question: ${question}`
      : question;

    if (noLamma) {
      const cached = getCachedResponse(question, settings.model);
      if (cached) {
        const responseText = `🤖 **Cached Response:**\n\n${cached}`;
        await sendTelegramMessage(chatId, responseText);
        addToHistory(chatId, 'assistant', cached);
        return;
      }

      const result = await invokeAIFallback(enrichedPrompt, settings.systemPrompt, chatId);
      if (result.success) {
        saveCachedResponse(question, settings.model, result.answer);
        await sendTelegramMessage(chatId, `🤖 **${result.source}:**\n\n${result.answer}`);
        addToHistory(chatId, 'assistant', result.answer);
      } else {
        await sendTelegramMessage(chatId, result.message);
      }
    } else {
      const cached = getCachedResponse(question, settings.model);
      if (cached) {
        const responseText = `🤖 **Cached Response:**\n\n${cached}`;
        await sendTelegramMessage(chatId, responseText);
        addToHistory(chatId, 'assistant', cached);
        return;
      }

      try {
        const answer = await invokeOllama(enrichedPrompt, settings.systemPrompt, settings.model);
        if (answer) {
          saveCachedResponse(question, settings.model, answer);
          await sendTelegramMessage(chatId, answer);
          addToHistory(chatId, 'assistant', answer);
        }
      } catch (error) {
        log(`Ollama failed: ${error.message}`, 'WARN');
        const result = await invokeAIFallback(enrichedPrompt, settings.systemPrompt, chatId);
        if (result.success) {
          saveCachedResponse(question, settings.model, result.answer);
          await sendTelegramMessage(chatId, `🤖 **${result.source}:**\n\n${result.answer}`);
          addToHistory(chatId, 'assistant', result.answer);
        } else {
          await sendTelegramMessage(chatId, result.message);
        }
      }
    }
  } else if (text.match(/^\/fix/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/fix');

    const fixContent = text.replace(/^\/fix\s*/, '');
    if (!fixContent) {
      await sendTelegramMessage(chatId, 'Usage: /fix [error message or code to fix]\n\nExample: /fix Error: Cannot find module');
      return;
    }

    const rateLimitCheck = checkRateLimit(chatId);
    if (!rateLimitCheck.allowed) {
      const resetMin = Math.ceil(rateLimitCheck.resetIn / 60);
      await sendTelegramMessage(chatId, `⏱️ **Rate limit exceeded**\n\nYou've hit the ${rateLimitCheck.reason}.\n\nTry again in ~${resetMin} minute(s).`);
      return;
    }

    state.stats.totalPrompts++;
    const settings = getUserSettings(chatId);
    const systemPrompt = 'You are an expert debugging assistant. Analyze the error or code provided and suggest a fix. Be concise and practical.';

    addToHistory(chatId, 'user', `Fix: ${fixContent}`);

    const fixPrompt = `Fix this issue: ${fixContent}`;

    if (noLamma) {
      const cached = getCachedResponse(fixContent, settings.model);
      if (cached) {
        await sendTelegramMessage(chatId, `🔧 **Cached Fix:**\n\n${cached}`);
        addToHistory(chatId, 'assistant', cached);
        return;
      }

      const result = await invokeAIFallback(fixPrompt, systemPrompt, chatId);
      if (result.success) {
        saveCachedResponse(fixContent, settings.model, result.answer);
        await sendTelegramMessage(chatId, `🔧 **Fix from ${result.source}:**\n\n${result.answer}`);
        addToHistory(chatId, 'assistant', result.answer);
      } else {
        await sendTelegramMessage(chatId, result.message);
      }
    } else {
      const cached = getCachedResponse(fixContent, settings.model);
      if (cached) {
        await sendTelegramMessage(chatId, `🔧 **Cached Fix:**\n\n${cached}`);
        addToHistory(chatId, 'assistant', cached);
        return;
      }

      try {
        const answer = await invokeOllama(fixPrompt, systemPrompt, settings.model);
        if (answer) {
          saveCachedResponse(fixContent, settings.model, answer);
          await sendTelegramMessage(chatId, `🔧 **Fix Suggestion:**\n\n${answer}`);
          addToHistory(chatId, 'assistant', answer);
        }
      } catch (error) {
        log(`Ollama fix failed: ${error.message}`, 'WARN');
        const result = await invokeAIFallback(fixPrompt, systemPrompt, chatId);
        if (result.success) {
          saveCachedResponse(fixContent, settings.model, result.answer);
          await sendTelegramMessage(chatId, `🔧 **Fix from ${result.source}:**\n\n${result.answer}`);
          addToHistory(chatId, 'assistant', result.answer);
        } else {
          await sendTelegramMessage(chatId, '❌ All AI backends unavailable');
        }
      }
    }
  } else if (text.match(/^\/stats/)) {
    const uptime = Math.floor((Date.now() - state.stats.startTime) / 1000);
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${days} days ${hours}h ${minutes}m`;

    let commandStats = '';
    for (const [cmd, count] of Object.entries(state.stats.commandCounts).sort()) {
      commandStats += `  /${cmd} :: ${count}\n`;
    }

    if (!commandStats) {
      commandStats = '  No commands tracked yet\n';
    }

    const lastActivityMs = Date.now() - state.stats.lastActivity;
    let lastActivityStr;
    if (lastActivityMs < 60000) {
      lastActivityStr = 'just now';
    } else if (lastActivityMs < 3600000) {
      lastActivityStr = `${Math.floor(lastActivityMs / 60000)} minutes ago`;
    } else {
      lastActivityStr = `${Math.floor(lastActivityMs / 3600000)} hours ago`;
    }

    const statsText = `📊 **GovnoBot Statistics**\n\n` +
      `⏱️ Uptime: ${uptimeStr}\n` +
      `📝 Total Commands: ${state.stats.totalCommands}\n` +
      `🧠 Total Prompts: ${state.stats.totalPrompts}\n` +
      `🕐 Last Activity: ${lastActivityStr}\n\n` +
      `**Command Usage:**\n${commandStats}`;

    await sendTelegramMessage(chatId, statsText);
  } else if (text.match(/^\/history/)) {
    const historyArg = text.replace(/^\/history\s*/, '');
    let limit = 5;
    if (historyArg && /^\d+$/.test(historyArg)) {
      limit = parseInt(historyArg);
    }

    const history = getConversationHistory(chatId, limit);

    if (history.length === 0) {
      await sendTelegramMessage(chatId, '📋 No conversation history yet. Start asking questions!');
      return;
    }

    let historyText = `📋 **Conversation History** (last ${history.length}):\n\n`;
    for (const entry of history) {
      const role = entry.role === 'user' ? '👤' : '🤖';
      let content = entry.content;
      if (content.length > 100) {
        content = content.slice(0, 97) + '...';
      }
      historyText += `${role} [${entry.timestamp}]: ${content}\n\n`;
    }

    await sendTelegramMessage(chatId, historyText);
  } else if (text.match(/^\/model/)) {
    const modelArg = text.replace(/^\/model\s*/, '');

    if (!modelArg) {
      const currentSettings = getUserSettings(chatId);
      let modelText = `🤖 **AI Model Settings**\n\n` +
        `Current Model: **${currentSettings.model}**\n\n` +
        `Available Models:\n`;
      for (const model of CONFIG.availableModels) {
        const mark = model === currentSettings.model ? '✅' : '⭕';
        modelText += `${mark} ${model}\n`;
      }
      modelText += `\n*Usage: /model [model_name]*`;
      await sendTelegramMessage(chatId, modelText);
      return;
    }

    if (CONFIG.availableModels.includes(modelArg)) {
      const settings = getUserSettings(chatId);
      settings.model = modelArg;
      saveUserSettings(chatId, settings);
      await sendTelegramMessage(chatId, `✅ Model switched to **${modelArg}**`);
      log(`Model changed to ${modelArg} for chat ${chatId}`);
    } else {
      const availableList = CONFIG.availableModels.join(', ');
      await sendTelegramMessage(chatId, `❌ Unknown model: ${modelArg}\n\nAvailable: ${availableList}`);
    }
  } else if (text.match(/^\/settings/)) {
    const settingsArg = text.replace(/^\/settings\s*/, '');

    if (settingsArg.match(/^prompt\s+(.+)$/)) {
      const newPrompt = settingsArg.match(/^prompt\s+(.+)$/)[1];
      const settings = getUserSettings(chatId);
      settings.systemPrompt = newPrompt;
      saveUserSettings(chatId, settings);
      await sendTelegramMessage(chatId, `✅ System prompt updated!\n\n*New prompt:*\n${newPrompt}`);
      log(`System prompt updated for chat ${chatId}`);
      return;
    }

    if (settingsArg.match(/^reset$/)) {
      const settings = getUserSettings(chatId);
      settings.systemPrompt = 'You are a helpful assistant.';
      settings.model = CONFIG.ollamaModel;
      settings.maxHistoryContext = 5;
      saveUserSettings(chatId, settings);
      await sendTelegramMessage(chatId, '✅ Settings reset to defaults');
      log(`Settings reset for chat ${chatId}`);
      return;
    }

    const settings = getUserSettings(chatId);
    let promptPreview = settings.systemPrompt;
    if (promptPreview.length > 60) {
      promptPreview = promptPreview.slice(0, 57) + '...';
    }

    const settingsText = `⚙️ **Your Settings**\n\n` +
      `🤖 AI Model: **${settings.model}**\n` +
      `📝 Max History Context: **${settings.maxHistoryContext}** messages\n` +
      `💭 System Prompt:\n_${promptPreview}_\n\n` +
      `**Commands:**\n` +
      `/settings prompt [new prompt] - Set custom system prompt\n` +
      `/settings reset - Reset to defaults\n` +
      `/model [name] - Change AI model\n`;

    await sendTelegramMessage(chatId, settingsText);
  } else if (text.match(/^\/sh/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/sh');

    const shCommand = text.replace(/^\/sh\s*/, '');
    if (!shCommand) {
      const allowedList = 'get-process, get-service, get-childitem, get-item, get-content, test-path, whoami, hostname, ipconfig';
      await sendTelegramMessage(chatId, `Usage: /sh [your command]\n\nAllowed: ${allowedList}`);
      return;
    }

    if (!isAdminCommandAllowed(shCommand)) {
      const allowedList = 'get-process, get-service, get-childitem, get-item, get-content, test-path, whoami, hostname, ipconfig';
      await sendTelegramMessage(chatId, `⚠️ Command not allowed. Allowed: ${allowedList}`);
      return;
    }

    // Shell execution intentionally not implemented in Node.js version for security
    await sendTelegramMessage(chatId, '⚠️ Command validated but shell execution is disabled in Node.js version for security.');
  } else if (text.match(/^\/jack/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/jack');

    const msg = text.replace(/^\/jack\s*/, '');
    if (!msg || msg.length === 0) {
      await sendTelegramMessage(chatId, 'Please add message. Example: /jack hi');
      return;
    }

    // In Node.js, we would need to implement Facebook Messenger API
    await sendTelegramMessage(chatId, '⚠️ Facebook Messenger integration not implemented in Node.js version');
  } else if (text.match(/^\/chain/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/chain');

    const chainPrompt = text.replace(/^\/chain\s*/, '');
    if (!chainPrompt) {
      await sendTelegramMessage(chatId, 'Usage: /chain [step1 | step2 | step3 ...]\n\nChain multiple prompts separated by pipes (|).');
      return;
    }

    const rateLimitCheck = checkRateLimit(chatId);
    if (!rateLimitCheck.allowed) {
      await sendTelegramMessage(chatId, '⏱️ **Rate limit exceeded**');
      return;
    }

    state.stats.totalPrompts++;
    const settings = getUserSettings(chatId);

    const steps = chainPrompt.split('|').map(s => s.trim());
    if (steps.length < 2) {
      await sendTelegramMessage(chatId, '❌ Chain requires at least 2 steps separated by | (pipe)');
      return;
    }

    await sendTelegramMessage(chatId, `⛓️ **Starting ${steps.length}-step chain...**`);
    addToHistory(chatId, 'user', `Chain: ${chainPrompt}`);

    let previousOutput = '';
    let chainCount = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNum = i + 1;

      const prompt = previousOutput
        ? `Context from previous step: ${previousOutput}\nNext step: ${step}`
        : step;

      log(`Chain step ${stepNum}/${steps.length}: ${step}`, 'DEBUG');

      try {
        let answer;
        if (noLamma) {
          const result = await invokeAIFallback(prompt, settings.systemPrompt, chatId);
          answer = result.success ? result.answer : null;
        } else {
          try {
            answer = await invokeOllama(prompt, settings.systemPrompt, settings.model);
          } catch {
            answer = null;
          }
        }

        if (answer) {
          previousOutput = answer;
          chainCount++;
          const resultText = `**Step ${stepNum}/${steps.length}:** ${step}\n\n${answer}`;
          await sendTelegramMessage(chatId, resultText);
          await new Promise(r => setTimeout(r, 500));
        } else {
          await sendTelegramMessage(chatId, `❌ Step ${stepNum} failed`);
          break;
        }
      } catch (error) {
        log(`Chain step ${stepNum} failed: ${error.message}`, 'ERROR');
        await sendTelegramMessage(chatId, `❌ Error in step ${stepNum}: ${error.message}`);
        break;
      }
    }

    if (chainCount === steps.length) {
      await sendTelegramMessage(chatId, '✅ **Chain completed successfully!**');
      addToHistory(chatId, 'assistant', `Chain completed with ${steps.length} steps`);
    }
  } else if (text.match(/^\/agent/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/agent');

    const agentPrompt = text.replace(/^\/agent\s*/, '');
    if (!agentPrompt) {
      await sendTelegramMessage(chatId, 'Usage: /agent [complex task description]\n\nExample: /agent Create a plan to automate daily standup');
      return;
    }

    state.stats.totalPrompts++;

    await sendTelegramMessage(chatId, `🤖 Starting agent session...\n\nTask: ${agentPrompt}`);

    if (noLamma) {
      const systemPrompt = 'You are an autonomous agent. Break down the task into steps, execute them methodically, and report progress. Think step-by-step.';
      const result = await invokeAIFallback(agentPrompt, systemPrompt, chatId);
      if (result.success) {
        await sendTelegramMessage(chatId, `🤖 **Agent from ${result.source}:**\n\n${result.answer}`);
      } else {
        await sendTelegramMessage(chatId, result.message);
      }
    } else {
      const systemPrompt = 'You are an autonomous agent. Break down the task into steps, execute them methodically, and report progress. Think step-by-step.';
      try {
        const answer = await invokeOllama(agentPrompt, systemPrompt);
        if (answer) {
          await sendTelegramMessage(chatId, `🤖 **Agent Response:**\n\n${answer}`);
        }
      } catch (error) {
        log(`Ollama agent failed: ${error.message}`, 'WARN');
        const result = await invokeAIFallback(agentPrompt, systemPrompt, chatId);
        if (result.success) {
          await sendTelegramMessage(chatId, `🤖 **Agent from ${result.source}:**\n\n${result.answer}`);
        } else {
          await sendTelegramMessage(chatId, '❌ All AI backends unavailable');
        }
      }
    }
  } else if (text.match(/^\/dev/)) {
    if (!restrictToAdmin(message)) return;
    logAdminAction(username, chatId, '/dev');

    await sendTelegramMessage(chatId, '[Dev] Triggering self-improvement process...');
    log('Self-improvement triggered by @' + username);

    // In Node.js, we would need VS Code API to implement this
    // For now, just acknowledge the command
  } else if (text && !text.match(/^\//)) {
    await sendTelegramMessage(chatId, '[Info] Message received. Use /help to see available commands.');
  }
};

// ============================================================================
// Polling Loop
// ============================================================================

const startBotPolling = async () => {
  log('Starting GovnoBot polling...');
  log('Press Ctrl+C to stop');

  let errorCount = 0;
  const maxConsecutiveErrors = 5;

  while (true) {
    try {
      const updates = await getTelegramUpdates(state.lastUpdateId + 1);

      if (updates && updates.ok && updates.result && updates.result.length > 0) {
        errorCount = 0;

        for (const update of updates.result) {
          state.lastUpdateId = update.update_id;

          try {
            if (update.message) {
              await handleCommand(update.message);
            }
          } catch (error) {
            log(`Error processing update ${update.update_id}: ${error.message}`, 'ERROR');
          }
        }
      }

      if (noLoop) {
        log('NoLoop flag detected. Exiting after single iteration.', 'INFO');
        break;
      }

      await new Promise(r => setTimeout(r, CONFIG.pollInterval));
    } catch (error) {
      errorCount++;
      log(`Error in polling loop (attempt ${errorCount}/${maxConsecutiveErrors}): ${error.message}`, 'ERROR');

      if (errorCount >= maxConsecutiveErrors) {
        log('Too many consecutive errors. Waiting 60 seconds before retry...', 'ERROR');
        await new Promise(r => setTimeout(r, 60000));
        errorCount = 0;
      } else {
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }
};

// ============================================================================
// Main Execution
// ============================================================================

const main = async () => {
  try {
    // Validate configuration
    if (!CONFIG.botToken) {
      log('❌ TELEGRAM_GOVNOBOT_TOKEN is not set. Exiting.', 'ERROR');
      process.exit(1);
    }

    // Warn if admin not configured
    const adminUserConfigured = !!(CONFIG.adminUsername && CONFIG.adminUsername.trim());
    const adminChatConfigured = !!CONFIG.adminChatId && CONFIG.adminChatId !== 0;
    if (!adminUserConfigured || !adminChatConfigured) {
      log('⚠️ Admin configuration incomplete. Set TELEGRAM_GOVNOBOT_ADMIN_USERNAME and TELEGRAM_GOVNOBOT_ADMIN_CHATID for secure admin-only commands.', 'WARN');
    }

    // Initialize
    initDirectories();

    log('---------------------------------------');
    log(`🤖 GovnoBot v${CONFIG.version} - Starting...`);
    log('---------------------------------------');
    log(`📅 Version Date: ${CONFIG.versionDate}`);
    log(`🔑 Bot Token: ${CONFIG.botToken.slice(0, 10)}...`);
    log(`⏱️ Poll Interval: ${CONFIG.pollInterval / 1000} seconds`);
    log(`🧠 AI Model: ${CONFIG.ollamaModel}`);
    log(`🔗 Ollama URL: ${CONFIG.ollamaUrl}`);
    log(`🐛 Debug Mode: ${debug}`);
    log(`🚫 NoLamma Mode: ${noLamma}`);
    log('---------------------------------------');

    // Test Ollama connection if not in NoLamma mode
    if (!noLamma) {
      try {
        log('Testing Ollama connection...');
        await invokeOllama('test', '', CONFIG.ollamaModel);
        log('✅ Ollama connection successful!');
      } catch (error) {
        log(`⚠️ Warning: Cannot connect to Ollama at ${CONFIG.ollamaUrl}`, 'WARN');
        log('   Bot will fall back to VS Code when needed', 'WARN');
      }
    }

    log('🚀 Bot is now running. Press Ctrl+C to stop.');
    log('---------------------------------------');

    // Start polling
    await startBotPolling();

    log('Bot stopped.');
    process.exit(0);
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main();
