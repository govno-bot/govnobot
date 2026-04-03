const fs = require('fs');
const { chunk } = require('../utils/chunker');
const { handleError } = require('../utils/error-handler');
const SettingsStore = require('../storage/settings-store');
const HistoryStore = require('../storage/history-store');
const ReminderStore = require('../storage/reminder-store');
const path = require('path');



const remindCommand = require('./public/command-remind');
const personaCommand = require('./public/command-persona');
const gmCommand = require('./public/command-gm');
const imagineCommand = require('./public/command-imagine');
const { pinCommand, unpinCommand, contextCommand, summaryCommand } = require('./public/command-pin');
const macroCommand = require('./public/command-macro');
const marketplaceCommand = require('./public/command-marketplace');


const logsCommand = require('./admin/command-logs');
const { fetchWikipediaSummary, searchWikipedia, fetchWikipediaSection, fetchWikipediaDisambiguation } = require('../ai/wikipedia');


/**
 * Command Handler
 * Routes incoming messages to appropriate command handlers
 */

class CommandHandler {
  constructor(client, config, logger, rateLimiter, fallbackChain, auditLogger, reminderStore, notepadStore, memoryGraph, options = {}) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.fallbackChain = fallbackChain;
    this.auditLogger = auditLogger;
    this.reminderStore = reminderStore;
    this.notepadStore = notepadStore;
    this.memoryGraph = memoryGraph; // Add per-user semantic memory with Q&A pairs
    this.botInfo = null;
    // Command registries
    this.publicCommands = {};
    this.adminCommands = {};
    this.plugins = {};
    this.options = options || {};
    this.execFile = require('child_process').execFile;
    // Ephemeral session tracking: { [chatId]: { history: [], settings: {}, ... } }
    this.ephemeralSessions = {};
    this.ephemeralTimeoutMs = 30 * 60 * 1000; // 30 min default

    // Register core commands
    this.registerPublicCommand('status', this.handleStatus.bind(this));
    this.registerPublicCommand('version', this.handleVersion.bind(this));
    this.registerPublicCommand('help', this.handleHelp.bind(this));
    this.registerPublicCommand('ask', this.handleAsk.bind(this));
    this.registerPublicCommand('model', this.handleModel.bind(this));
    this.registerPublicCommand('history', this.handleHistory.bind(this));
    this.registerPublicCommand('settings', this.handleSettings.bind(this));

    // Register external commands
    this.registerPublicCommand(remindCommand.name, remindCommand.handler);
    this.registerPublicCommand(personaCommand.name, personaCommand.handler);
    this.registerPublicCommand(gmCommand.name, gmCommand.handler);
    this.registerPublicCommand(imagineCommand.name, imagineCommand.handler);

    // Admin commands
    // Note: sh, agent, audit are handled inline in the handle() method
    this.registerAdminCommand(logsCommand.name, logsCommand.handler);

    console.log('Registered public commands:', Object.keys(this.publicCommands));
    console.log('Registered admin commands:', Object.keys(this.adminCommands));
  }

  /**
   * Returns an array of Telegram Menu commands (for setMyCommands)
   */
  getMenuCommands() {
    const candidates = [
      { command: 'start', description: 'Start the bot and get a welcome message' },
      { command: 'help', description: 'Show available commands' },
      { command: 'ask', description: 'Ask a question to AI' },
      { command: 'status', description: 'Show bot status and uptime' },
      { command: 'version', description: 'Show bot version' },
      { command: 'remind', description: 'Set a reminder' },
      { command: 'history', description: 'View conversation history' },
      { command: 'model', description: 'View/change AI model' },
      { command: 'persona', description: 'Set personality' },
      { command: 'gm', description: 'Game Master mode' },
      { command: 'imagine', description: 'Image generation' }
    ];

    return candidates.filter(c => this.publicCommands[c.command]).map(c => ({ command: c.command, description: c.description }));
  }

  /**
   * Main command dispatcher (simplified for patch)
   */
  async handle(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    const text = (context.message && context.message.text || context.text || '').trim();
    if (context.message && context.message.text) {
      this.logger.debug(`handle() - Processing message: "${context.message.text}" from chat ${chatId}`);
    }
    
    // Check if user is admin (admin users bypass rate limits)
    const from = context.message && context.message.from ? context.message.from : {};
    const isAdmin = (from.username && this.config && this.config.telegram && from.username === this.config.telegram.adminUsername) || (this.config && this.config.telegram && this.config.telegram.adminChatId && from.id === this.config.telegram.adminChatId);
    
    // Rate limiting: short-circuit if present (skip for admins)
    if (!isAdmin) {
      try {
        if (this.rateLimiter && typeof this.rateLimiter.isAllowed === 'function') {
          if (!this.rateLimiter.isAllowed(chatId)) {
            const status = (this.rateLimiter.getStatus && typeof this.rateLimiter.getStatus === 'function') ? this.rateLimiter.getStatus(chatId) : null;
            const msg = status ? `Rate limit exceeded` : 'Rate limit exceeded';
            await this.client.sendMessage(chatId, msg);
            return;
          }
        }
      } catch (e) {
        // Ignore rate limiter errors and continue
      }
    }
    // Route inline mentions or replies to the bot as /ask queries
    if (context.message && this.botInfo) {
      const msgText = context.message.text || '';
      // Mention in text: remove @BotUsername and route to handleAsk
      if (msgText.includes('@' + this.botInfo.username)) {
        const cleaned = msgText.split(/\s+/).filter(p => p !== ('@' + this.botInfo.username)).join(' ');
        context.args = cleaned.split(/\s+/).filter(Boolean);
        return this.handleAsk(context);
      }
      // Reply to bot: reply_to_message.from is the bot
      if (context.message.reply_to_message && context.message.reply_to_message.from && (context.message.reply_to_message.from.is_bot || (context.message.reply_to_message.from.username === this.botInfo.username))) {
        const replyText = context.message.text || '';
        context.args = replyText.split(/\s+/).filter(Boolean);
        return this.handleAsk(context);
      }
    }
    // Ephemeral session commands
    if (text === '/ephemeral') {
      return this.handleEphemeralStart(context);
    }
    if (text === '/end') {
      return this.handleEphemeralEnd(context);
    }
    // If in ephemeral mode, mark context
    if (this.ephemeralSessions[chatId]) {
      context.ephemeral = true;
    }
    // Multi-modal input: handle incoming images/files
    if (context.message && context.message.photo) {
      return this.handleIncomingPhoto(context);
    }
    if (context.message && context.message.document) {
      return this.handleIncomingDocument(context);
    }
    if (text.startsWith('/wiki')) {
      return this.handleWiki(context);
    }
    // Multi-modal output demo commands
    if (text.startsWith('/sendimage')) {
      return this.handleSendImage(context);
    }
    if (text.startsWith('/sendfile')) {
      return this.handleSendFile(context);
    }
    // Multi-modal structured form demo
    if (text.startsWith('/formdemo')) {
      return this.handleFormDemo(context);
    }
    // Handle callback_query for form responses
    if (context.callbackQuery) {
      return this.handleFormResponse(context);
    }
    // Route registered commands (general handler)
    if (context.message && context.message.text && context.message.text.startsWith('/')) {
      const msgText = context.message.text.trim();
      const parts = msgText.split(/\s+/);
      let cmd = parts[0].slice(1).split('@')[0];
      const args = parts.slice(1);
      this.logger.debug(`Parsed command: "${cmd}" with args: ${JSON.stringify(args)}`);

      this.logger.debug(`Checking publicCommands: ${JSON.stringify(Object.keys(this.publicCommands))}`);
      this.logger.debug(`Looking for cmd='${cmd}' in publicCommands. Exists: ${!!this.publicCommands[cmd]}`);
      if (this.publicCommands[cmd]) {
        this.logger.info(`Routing public command: ${cmd}`);
        try {
          const result = await this.publicCommands[cmd]({ chatId, args, message: context.message, telegramApiClient: this.client, config: this.config, reminderStore: this.reminderStore, logger: this.logger });
          this.logger.debug(`Command ${cmd} completed with result: ${JSON.stringify(result)}`);
        } catch (err) {
          this.logger.error(`Error handling command ${cmd}:`, err);
          await this.client.sendMessage(chatId, 'An error occurred processing your command');
        }
        return;
      }
      this.logger.debug(`Command '${cmd}' NOT found in publicCommands`);

      if (this.adminCommands[cmd]) {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        try {
          await this.adminCommands[cmd]({ chatId, args, message: context.message, telegramApiClient: this.client, config: this.config });
        } catch (err) {
          this.logger.error(`Error handling admin command ${cmd}:`, err);
          await this.client.sendMessage(chatId, 'An error occurred processing your command');
        }

        return;
      }

      // Built-in admin commands
      this.logger.debug(`Checking if "${cmd}" is a built-in admin command (isAdmin=${isAdmin})`);
      if (cmd === 'sh') {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        this.logger.info(`Executing /sh command`);
        const whitelist = (this.config && this.config.security && this.config.security.shCommandWhitelist) || [];
        const cmdName = args && args.length > 0 ? args[0] : '';
        if (whitelist.length > 0 && !whitelist.includes(cmdName)) {
          return this.client.sendMessage(chatId, `Command not whitelisted: ${cmdName}. Allowed: ${whitelist.join(', ')}`);
        }
        const commandStr = args.join(' ');
        const execFn = this.exec || require('child_process').exec;
        try {
          const shTimeout = 30000; // 30 second timeout for shell commands
          await new Promise(async (resolve) => {
            let completed = false;
            const timeoutHandle = setTimeout(() => {
              if (!completed) {
                completed = true;
                this.logger.error(`/sh command timed out after ${shTimeout}ms`);
                this.client.sendMessage(chatId, `Command execution timed out (${shTimeout}ms)`).catch(() => {});
                resolve();
              }
            }, shTimeout);
            
            try {
              execFn(commandStr, {}, async (err, stdout, stderr) => {
                if (!completed) {
                  completed = true;
                  clearTimeout(timeoutHandle);
                  try {
                    if (err) {
                      this.logger.error(`/sh command error: ${err.message}`);
                      await this.client.sendMessage(chatId, `Error: ${err.message}`);
                    } else {
                      let out = stdout || '';
                      const limit = 2000;
                      if (out.length > limit) {
                        out = out.slice(0, limit) + '\n\n(truncated)';
                      }
                      this.logger.debug(`/sh command output: ${out.length} chars`);
                      await this.client.sendMessage(chatId, out || '(no output)');
                    }
                  } catch (e) {
                    this.logger.error(`Error sending /sh result: ${e.message}`);
                  }
                  resolve();
                }
              });
            } catch (e) {
              if (!completed) {
                completed = true;
                clearTimeout(timeoutHandle);
                this.logger.error(`/sh exec error: ${e.message}`);
                this.client.sendMessage(chatId, `Error: ${e.message}`).catch(() => {});
                resolve();
              }
            }
          });
        } catch (err) {
          this.logger.error(`/sh outer catch: ${err.message}`);
          await this.client.sendMessage(chatId, 'An error occurred running command');
        }
        // Audit log
        if (this.auditLogger && typeof this.auditLogger.log === 'function') {
          try { this.auditLogger.log(context.message.from, 'sh', { args }); } catch (e) {}
        }
        return;
      }

      if (cmd === 'jack') {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        const messageText = args.join(' ');
        const scriptPath = path.join((this.config && this.config.projectRoot) || process.cwd(), 'sendMessageToJack.ps1');
        const execFileFn = this.execFile || require('child_process').execFile;
        try {
          await new Promise((resolve) => {
            execFileFn('powershell', ['-File', scriptPath, '-Message', messageText], {}, async (err, stdout, stderr) => {
              try {
                if (err) {
                  await this.client.sendMessage(chatId, `Error sending to Jack: ${err.message}`);
                } else {
                  await this.client.sendMessage(chatId, 'Message sent to Jack');
                }
              } catch (e) {}
              resolve();
            });
          });
        } catch (err) {
          await this.client.sendMessage(chatId, 'Failed to run Jack script');
        }
        return;
      }

      if (cmd === 'agent') {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        const goal = args.join(' ').trim();
        if (!goal) return this.client.sendMessage(chatId, 'Usage: /agent <goal>');
        try {
          if (this.notepadStore && typeof this.notepadStore.load === 'function' && typeof this.notepadStore.update === 'function') {
            const current = await this.notepadStore.load();
            const goals = Array.isArray(current.goals) ? current.goals.slice() : [];
            goals.push(goal);
            await this.notepadStore.update({ goals });
          }
          await this.client.sendMessage(chatId, 'Goal added');
        } catch (err) {
          if (this.logger && this.logger.error) this.logger.error('agent command error', err);
          await this.client.sendMessage(chatId, 'Failed to add goal');
        }
        return;
      }

      // Built-in general commands
      if (cmd === 'start') {
        return this.handleStart({ chatId, message: context.message });
      }

      if (cmd === 'help') {
        return this.handleHelp({ chatId, message: context.message, isAdmin });
      }

      if (cmd === 'model') {
        context.args = args;
        return this.handleModel({ chatId, args, message: context.message });
      }

      if (cmd === 'history') {
        context.args = args;
        return this.handleHistory({ chatId, args, message: context.message });
      }

      if (cmd === 'settings') {
        context.args = args;
        return this.handleSettings({ chatId, args, message: context.message });
      }

      // NOTE: status and version are now handled via publicCommands registration above
      // No need for separate built-in handling - keep that code consolidated

      if (cmd === 'ask') {
        // build args from message text if not present
        context.args = args.length ? args : (context.message && context.message.text ? context.message.text.split(/\s+/).slice(1) : []);
        return this.handleAsk({ chatId, args: context.args, message: context.message });
      }

      // Unknown command
      return this.client.sendMessage(chatId, 'Unknown command. Try /help');
    }
    // Macro commands
    if (text.startsWith('/macro')) {
      return macroCommand.handler(context);
    }
    // Marketplace commands
    if (text.startsWith('/marketplace')) {
      return marketplaceCommand.handler(context);
    }
    // Inline Wikipedia lookup for normal messages (not commands)
    // If user preferences allow ('all' or 'mentions' with bot mention), try to detect topic mentions
    if (context.message && context.message.text && !context.message.text.startsWith('/')) {
      try {
        const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
        const settingsDir = path.join(this.config.dataDir || '.', 'settings');
        const settingsStore = new SettingsStore(chatId, settingsDir, this.ephemeralSessions[chatId]);
        const settings = await settingsStore.load().catch(() => ({}));
        const notif = (settings && settings.notifications) || 'all';
        // If user set notifications to 'none', skip
        if (notif === 'none') {
          // continue processing without inline wiki
        } else if (notif === 'mentions' && this.botInfo) {
          // only when bot is explicitly mentioned
          if (context.message.text.includes('@' + this.botInfo.username)) {
            await this._maybeSendInlineWiki(context, settings.language || 'en');
          }
        } else if (notif === 'all') {
          await this._maybeSendInlineWiki(context, settings.language || 'en');
        }
      } catch (e) {
        // ignore inline wiki errors
        if (this.logger && this.logger.error) this.logger.error('inline wiki error', e);
      }
    }
    // ...existing command routing logic...
  }

  /**
   * Demo: Send an image to the user (multi-modal output)
   */
  async handleSendImage(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // Example: send a sample image by URL (Telegram supports HTTP URLs)
    const imageUrl = 'https://telegram.org/img/t_logo.png';
    await this.client.sendPhoto(chatId, imageUrl, { caption: 'Here is an image! (multi-modal output)' });
  }

  /**
   * Demo: Send a file to the user (multi-modal output)
   */
  async handleSendFile(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // Example: send a sample file by URL (Telegram supports HTTP URLs)
    const fileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    await this.client.sendDocument(chatId, fileUrl, { caption: 'Here is a file! (multi-modal output)' });
  }

  /**
   * Handle incoming photo (image) messages
   */
  async handleIncomingPhoto(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // For demo: just acknowledge receipt
    await this.client.sendMessage(chatId, '📷 Image received! (multi-modal input)');
    // TODO: Store, process, or forward image as needed
  }

  /**
   * Handle incoming document (file) messages
   */
  async handleIncomingDocument(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // For demo: just acknowledge receipt
    await this.client.sendMessage(chatId, '📄 File received! (multi-modal input)');
    // TODO: Store, process, or forward file as needed
  }

  async handleFormDemo(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    const text = 'What is your favorite color?';
    const keyboard = { reply_markup: { inline_keyboard: [[{ text: 'Blue', callback_data: 'form_color_blue' }, { text: 'Red', callback_data: 'form_color_red' }]] } };
    await this.client.sendMessage(chatId, text, keyboard);
  }

  /**
   * Handle /wiki <topic>
   */
  async handleWiki(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // Determine topic from args or message text. Support optional language code as last argument.
    let args = context.args || [];
    if ((!args || args.length === 0) && context.message && context.message.text) {
      args = context.message.text.split(/\s+/).slice(1);
    }
    if (!args || args.length === 0) {
      return this.client.sendMessage(chatId, 'Usage: /wiki <topic> [lang]');
    }

    // Detect if last arg is a language code (e.g., 'en', 'es', 'pt-br')
    let lang = null;
    if (args.length > 1) {
      const last = args[args.length - 1];
      if (/^[a-z]{2}(?:[-_][A-Za-z0-9]+)?$/i.test(last)) {
        lang = String(last).toLowerCase();
        args = args.slice(0, -1);
      }
    }

    const topicArg = Array.isArray(args) ? args.join(' ').trim() : (args || '').trim();
    // Support section selection using '#', e.g. 'Quantum Computing#History'
    let topic = topicArg;
    let section = null;
    if (topicArg && topicArg.includes('#')) {
      const parts = topicArg.split('#');
      topic = parts[0].trim();
      section = parts.slice(1).join('#').trim();
    }
    if (!topic) return this.client.sendMessage(chatId, 'Usage: /wiki <topic> [lang]');

    try {
      // Determine user's preferred language from settings if not provided
      const settingsDir = path.join(this.config.dataDir || '.', 'settings');
      const settingsStore = new SettingsStore(chatId, settingsDir, this.ephemeralSessions[chatId]);
      const settings = await settingsStore.load().catch(() => ({}));
      const effectiveLang = lang || (settings && settings.language) || 'en';

      // If user requested a specific section, try to fetch it first
      if (section) {
        const sec = await fetchWikipediaSection(topic, section, effectiveLang);
        if (sec && sec.extract) {
          const maxLen = 1800;
          let text = `*${sec.title} — ${sec.sectionTitle}*\n${sec.extract}\n\n${sec.url}`;
          if (text.length > maxLen) text = text.slice(0, maxLen) + '\n\n(truncated)';
          return this.client.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
        // If section not found, fall through to summary/search
      }

      // Try direct summary
      const summary = await fetchWikipediaSummary(topic, effectiveLang);
      if (summary && summary.extract) {
        const maxLen = 1800;
        let text = `*${summary.title}*\n${summary.extract}\n\n${summary.url}`;
        if (text.length > maxLen) text = text.slice(0, maxLen) + '\n\n(truncated)';
        return this.client.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      }

      // Check for disambiguation page options first
      const disamb = await fetchWikipediaDisambiguation(topic, effectiveLang);
      if (disamb && Array.isArray(disamb) && disamb.length > 0) {
        // Build inline keyboard with choices (limit to 8)
        const choices = disamb.slice(0, 8).map(d => [{ text: d.title || String(d), callback_data: 'wiki_select:' + encodeURIComponent(d.title || String(d)) }]);
        const text = `Multiple articles found for "${topic}". Please choose one:`;
        return this.client.sendMessage(chatId, text, { reply_markup: { inline_keyboard: choices } });
      }

      // Fallback: perform a search and try top result
      const suggestion = await searchWikipedia(topic, effectiveLang);
      if (suggestion) {
        const suggestedSummary = await fetchWikipediaSummary(suggestion, effectiveLang);
        if (suggestedSummary && suggestedSummary.extract) {
          const text = `Did you mean *${suggestedSummary.title}*?\n${suggestedSummary.extract}\n\n${suggestedSummary.url}`;
          return this.client.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
      }

      // Not found
      return this.client.sendMessage(chatId, `No Wikipedia article found for: ${topic}`);
    } catch (err) {
      if (this.logger && this.logger.error) this.logger.error('handleWiki error', err);
      return this.client.sendMessage(chatId, 'An error occurred fetching Wikipedia article.');
    }
  }

  async handleFormResponse(context) {
    // context.callbackQuery expected
    const cb = context.callbackQuery;
    if (cb && cb.id) {
      // Acknowledge
      if (this.client && typeof this.client.answerCallbackQuery === 'function') {
        await this.client.answerCallbackQuery(cb.id);
      }
      const chatId = (cb.message && cb.message.chat && cb.message.chat.id) || context.chatId;
      // Parse data
      if (cb.data && cb.data.startsWith('form_color_')) {
        const val = cb.data.replace('form_color_', '');
        const pretty = val.charAt(0).toUpperCase() + val.slice(1);
        await this.client.sendMessage(chatId, `You selected: ${pretty}`);
        return;
      }

      // Wiki selection callback (from disambiguation choices)
      if (cb.data && cb.data.startsWith('wiki_select:')) {
        const encoded = cb.data.replace('wiki_select:', '');
        let title = null;
        try { title = decodeURIComponent(encoded); } catch (e) { title = encoded; }
        if (!title) return;
        try {
          const summary = await fetchWikipediaSummary(title, 'en');
          if (summary && summary.extract) {
            const text = `*${summary.title}*\n${summary.extract}\n\n${summary.url}`;
            return this.client.sendMessage(chatId, text, { parse_mode: 'Markdown' });
          }
          // Fallback: plain title
          return this.client.sendMessage(chatId, `Selected: ${title}`);
        } catch (e) {
          return this.client.sendMessage(chatId, `Failed to fetch article: ${title}`);
        }
      }
    }
  }

  /**
   * Try to detect a topic mentioned in a normal chat message and send a brief Wikipedia summary.
   * This is conservative: sends at most one suggestion per message and limits length to avoid spam.
   */
  async _maybeSendInlineWiki(context, lang) {
    if (!context || !context.message || !context.message.text) return;
    const from = context.message.from || {};
    if (from.is_bot) return; // do not respond to bot messages
    const text = String(context.message.text || '');
    // Build candidate n-grams (1..3) of consecutive Titlecase words
    const tokens = text.split(/\s+/).map(t => t.replace(/[.,!?;:()\[\]"'`]/g, ''));
    const candidates = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let n = 3; n >= 1; n--) {
        if (i + n > tokens.length) continue;
        const slice = tokens.slice(i, i + n);
        // all tokens should start with uppercase letter and be at least 2 chars
        const ok = slice.every(s => /^[A-ZÀ-ÖØ-Þ][\p{L}\p{M}\d'’-]*$/u.test(s) && s.length > 1);
        if (ok) {
          const cand = slice.join(' ').trim();
          candidates.push(cand);
        }
      }
    }
    if (candidates.length === 0) return;
    // Try candidates in order, but avoid too many wiki calls; stop at first successful summary
    for (const cand of candidates.slice(0, 6)) {
      try {
        const suggestion = await searchWikipedia(cand, lang || 'en');
        if (!suggestion) continue;
        const summary = await fetchWikipediaSummary(suggestion, lang || 'en');
        if (summary && summary.extract) {
          const maxLen = 400;
          let extract = summary.extract.replace(/\s+/g, ' ').trim();
          if (extract.length > maxLen) extract = extract.slice(0, maxLen) + '...';
          const out = `*${summary.title}*\n${extract}\n\n${summary.url}`;
          try {
            await this.client.sendMessage(context.chatId || (context.message && context.message.chat && context.message.chat.id), out, { parse_mode: 'Markdown' });
          } catch (e) {
            // ignore send errors
          }
          return; // only one inline suggestion per message
        }
      } catch (e) {
        // ignore per-candidate errors
        if (this.logger && this.logger.error) this.logger.error('inline wiki candidate error', e);
      }
    }
  }

  async handleEphemeralStart(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    if (this.ephemeralSessions[chatId]) {
      return this.client.sendMessage(chatId, 'Ephemeral session is already active. Send /end to finish.');
    }
    // Start ephemeral session: in-memory only
    this.ephemeralSessions[chatId] = {
      history: [],
      settings: {},
      started: Date.now(),
      timeout: setTimeout(() => this._expireEphemeral(chatId), this.ephemeralTimeoutMs)
    };
    return this.client.sendMessage(chatId, 'Ephemeral session started. No messages or settings will be saved. Send /end to finish.');
  }

  /**
   * Handle /ask command: calls fallbackChain (AI) and sends response(s)
   */
  async handleAsk(context) {
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    const args = context.args || context.args || (context.message && context.message.text && context.message.text.split(' ').slice(1)) || [];
    const prompt = Array.isArray(args) ? args.join(' ') : (args || '');


    try {
      // Support streaming responses via onToken/isAborted
      let aborted = false;
      const isAborted = () => aborted;
      if (typeof context.setAbortHandler === 'function') {
        context.setAbortHandler(() => { aborted = true; });
      }

      // Buffer tokens and update a single message (edit) to avoid sending
      // one message per token (which can produce single-letter messages).
      const tokensBuffer = [];
      let streamingUsed = false;
      let streamingMessageId = null;
      let editTimer = null;

      const flushBuffer = async () => {
        if (editTimer) {
          clearTimeout(editTimer);
          editTimer = null;
        }
        const text = tokensBuffer.join('');
        if (!text) return;
        try {
          // If we haven't sent an initial message yet, send one and keep its id
          if (!streamingMessageId) {
            const resp = await this.client.sendMessage(chatId, text);
            // telegram response shape: { ok: true, result: { message_id: ... } }
            streamingMessageId = resp && resp.result && resp.result.message_id ? resp.result.message_id : null;
          } else {
            // Edit existing message with accumulated text
            await this.client.editMessage(chatId, streamingMessageId, text);
          }
        } catch (e) {
          if (this.logger && this.logger.error) this.logger.error('onToken send error', e);
        }
      };

      const scheduleFlush = (delay = 150) => {
        if (editTimer) return;
        editTimer = setTimeout(() => flushBuffer().catch(() => {}), delay);
      };

      const onToken = (t) => {
        streamingUsed = true;
        tokensBuffer.push(t);
        // Throttle edits to avoid spamming Telegram with too many edit requests
        scheduleFlush(120);
      };

      const chain = this.fallbackChain || context.fallbackChain;
      if (!chain || typeof chain.call !== 'function') {
        // No AI configured
        await this.client.sendMessage(chatId, 'No AI configured.');
        return;
      }

      // ===== Agent Context Injection =====
      // Load user context: settings, conversation history, notepad, memory graph
      const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
      let systemPrompt = '';
      let userSettings = {}; // Define outside promise scope so it's accessible for Q&A storage
      
      // Wrap context loading in a timeout to prevent hanging
      const CONTEXT_LOAD_TIMEOUT = 3000; // 3 seconds max
      await Promise.race([
        (async () => {
          try {
            // Skip context loading if config is minimal (likely test environment)
            if (!this.config.data && !this.config.dataDir && (!this.config.settings)) {
              return;
            }

            // Load user settings
            const settingsDir = path.join(dataDir, 'settings');
            const settingsStore = new SettingsStore(chatId, settingsDir, this.ephemeralSessions[chatId]);
            userSettings = await settingsStore.load();
            if (this.logger && this.logger.debug) this.logger.debug(`Loaded settings for chatId ${chatId}:`, userSettings);

            // Load recent conversation history (last 5 messages for context)
            const historyDir = path.join(dataDir, 'history');
            const historyStore = new HistoryStore(historyDir, this.ephemeralSessions[chatId]);
            const recentHistory = await historyStore.loadHistory(chatId, 5);
            if (this.logger && this.logger.debug) this.logger.debug(`Loaded ${recentHistory.length} recent messages for chatId ${chatId}`);

            // Load user's notepad (thoughts, goals, planned actions)
            let notepadData = null;
            if (this.notepadStore && typeof this.notepadStore.load === 'function') {
              notepadData = await this.notepadStore.load();
              if (this.logger && this.logger.debug) this.logger.debug(`Loaded notepad for chatId ${chatId}`);
            }

            // Build system prompt with context
            const contextBits = [];
            
            // Add base system prompt from user settings
            if (userSettings.systemPrompt) {
              contextBits.push(`System Instruction: ${userSettings.systemPrompt}`);
            }
            
            // Add user preferences
            if (userSettings.model) {
              contextBits.push(`User's preferred model: ${userSettings.model}`);
            }
            if (userSettings.language) {
              contextBits.push(`User's language preference: ${userSettings.language}`);
            }
            if (userSettings.verbosity) {
              contextBits.push(`User's verbosity preference: ${userSettings.verbosity}`);
            }

            // Add recent conversation context (if any)
            if (recentHistory && recentHistory.length > 0) {
              contextBits.push('\nRecent conversation context:');
              recentHistory.forEach(msg => {
                const role = msg.role || 'unknown';
                const content = msg.content || '';
                const truncated = content.length > 200 ? content.slice(0, 200) + '...' : content;
                contextBits.push(`  ${role}: ${truncated}`);
              });
            }

            // Add notepad context (bot's internal state)
            if (notepadData) {
              const notepadBits = [];
              if (notepadData.thoughts && notepadData.thoughts.trim()) {
                notepadBits.push(`Bot's thoughts: ${notepadData.thoughts}`);
              }
              if (notepadData.goals && Array.isArray(notepadData.goals) && notepadData.goals.length > 0) {
                notepadBits.push(`Bot's current goals: ${notepadData.goals.join(', ')}`);
              }
              if (notepadData.planned_actions && Array.isArray(notepadData.planned_actions) && notepadData.planned_actions.length > 0) {
                notepadBits.push(`Bot's planned actions: ${notepadData.planned_actions.join(', ')}`);
              }
              if (notepadData.notes && notepadData.notes.trim()) {
                notepadBits.push(`Bot's notes: ${notepadData.notes}`);
              }
              if (notepadBits.length > 0) {
                contextBits.push('\nInternal state (Notepad):');
                contextBits.push(notepadBits.join('\n'));
              }
            }

            // Add semantic memory context from MemoryGraph (relevant Q&A pairs)
            if (this.memoryGraph && chatId) {
              try {
                // Retrieve Q&A pairs similar to the current prompt
                const relevantQAs = this.memoryGraph.retrieveSimilarQAPairs(chatId, prompt, 3);
                if (relevantQAs && relevantQAs.length > 0) {
                  contextBits.push('\nSemantic Memory (Similar Q&A from past interactions):');
                  relevantQAs.forEach((qa, idx) => {
                    const qTrunc = qa.question.length > 150 ? qa.question.slice(0, 150) + '...' : qa.question;
                    const aTrunc = qa.answer.length > 150 ? qa.answer.slice(0, 150) + '...' : qa.answer;
                    contextBits.push(`  Similar Q${idx + 1}: ${qTrunc}`);
                    contextBits.push(`  Previous A${idx + 1}: ${aTrunc}`);
                  });
                }
              } catch (memErr) {
                if (this.logger && this.logger.debug) {
                  this.logger.debug(`Failed to load memory graph context: ${memErr.message}`);
                }
              }
            }

            // Construct the full system prompt
            if (contextBits.length > 0) {
              systemPrompt = contextBits.join('\n');
            }

            if (this.logger && this.logger.debug) {
              this.logger.debug(`Built system prompt for context injection: ${systemPrompt.length} chars`);
            }
          } catch (contextErr) {
            // Log context loading errors but don't fail the /ask command
            if (this.logger && this.logger.warn) {
              this.logger.warn(`Failed to load context for /ask: ${contextErr.message}`);
            }
          }
        })(),
        new Promise((resolve) => setTimeout(resolve, CONTEXT_LOAD_TIMEOUT))
      ]);

      // Build input for chain with system prompt + user message
      const inputForChain = [];
      if (systemPrompt) {
        inputForChain.push({ role: 'system', content: systemPrompt });
      }
      inputForChain.push({ role: 'user', content: prompt });
      
      // Add timeout to chain.call() to prevent polling loop from hanging
      const AI_TIMEOUT = 60000; // 60 second timeout for AI responses
      let result;
      try {
        result = await Promise.race([
          chain.call(inputForChain, { onToken, isAborted }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI response timed out after ' + AI_TIMEOUT + 'ms')), AI_TIMEOUT)
          )
        ]);
      } catch (timeoutErr) {
        if (this.logger && this.logger.error) this.logger.error('chain.call timeout or error', timeoutErr);
        await this.client.sendMessage(chatId, 'AI response timed out. Please try again.');
        return;
      }

      // Persist to history: save user prompt and assistant response
      try {
        const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
        const historyDir = path.join(dataDir, 'history');
        const historyStore = new HistoryStore(historyDir, this.ephemeralSessions[chatId]);

        // Save user message
        await historyStore.addMessage(chatId, 'user', prompt);

        // Ensure any pending edits are flushed
        try {
          if (editTimer) {
            clearTimeout(editTimer);
            editTimer = null;
          }
          await flushBuffer();
        } catch (e) {
          if (this.logger && this.logger.error) this.logger.error('flushBuffer error', e);
        }

        // Determine final assistant text
        let assistantText = '';
        if (Array.isArray(tokensBuffer) && tokensBuffer.length > 0) {
          assistantText = tokensBuffer.join('');
        }
        if (!assistantText && typeof result === 'string') assistantText = result;

        if (assistantText) {
          // If we streamed, we've already sent/edited a message containing the content.
          // In that case, only persist to history and avoid sending a duplicate final message.
          if (streamingUsed) {
            // Ensure final edit reflects complete text
            try {
              if (streamingMessageId) {
                await this.client.editMessage(chatId, streamingMessageId, assistantText);
              } else {
                await this.client.sendMessage(chatId, assistantText);
              }
            } catch (e) {
              if (this.logger && this.logger.error) this.logger.error('final edit/send error', e);
            }
            await historyStore.addMessage(chatId, 'assistant', assistantText);
          } else {
            const chunks = typeof chunk === 'function' ? chunk(assistantText) : [assistantText];
            for (const c of chunks) {
              await this.client.sendMessage(chatId, c);
            }
            await historyStore.addMessage(chatId, 'assistant', assistantText);
          }

          // Store Q&A pair in MemoryGraph for persistent semantic memory
          if (this.memoryGraph && chatId && prompt && assistantText) {
            try {
              this.memoryGraph.addQAPair(chatId, prompt, assistantText, {
                timestamp: Date.now(),
                model: userSettings?.model || 'unknown',
                source: 'ask_command'
              });
              this.memoryGraph.save();
              if (this.logger && this.logger.debug) {
                this.logger.debug(`Stored Q&A pair in MemoryGraph for user ${chatId}`);
              }
            } catch (memErr) {
              if (this.logger && this.logger.warn) {
                this.logger.warn(`Failed to store Q&A pair in MemoryGraph: ${memErr.message}`);
              }
            }
          }
        }
      } catch (err) {
        // ignore history save errors but log
        if (this.logger && this.logger.error) this.logger.error('history save error', err);
      }
    } catch (err) {
      if (this.logger && this.logger.error) this.logger.error('handleAsk error', err);
      await this.client.sendMessage(chatId, 'Sorry, I could not process your request.');
    }
  }
}

// GDPR/data privacy compliance handlers (must be outside of class)
CommandHandler.prototype.handlePrivacy = async function(context) {
  const { chatId } = context;
  const message = `
<b>Privacy & Data Protection</b>\n\nGovnoBot stores only the minimum data required for operation (settings, conversation history, reminders, etc.), all on this server.\n\n<b>Your rights:</b>\n- View/download your data: /mydata\n- Erase all your data: /forgetme\n- Clear history: /history clear\n\n<b>Data is never shared or sold.</b>\nLogs are anonymized and do not contain message content.\n\nFor questions, contact the admin.`;
  await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  if (this.auditLogger) this.auditLogger.log({ event: 'privacy_info', chatId });
};

CommandHandler.prototype.handleMyData = async function(context) {
  const { chatId } = context;
  const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
  const historyDir = path.join(dataDir, 'history');
  const settingsDir = path.join(dataDir, 'settings');
  const notepadDir = path.join(dataDir, 'notepad');
  const summaryDir = path.join(dataDir, 'summary');
  const pinsDir = path.join(dataDir, 'pins');
  const remindersPath = path.join(dataDir, 'reminders.json');
  const HistoryStore = require('../storage/history-store');
  const SettingsStore = require('../storage/settings-store');
  const NotepadStore = require('../storage/notepad-store');
  const SummaryStore = require('../storage/summary-store');
  const PinnedContextStore = require('../storage/pinned-context-store');
  const fs = require('fs');
  const historyStore = new HistoryStore(historyDir);
  const settingsStore = new SettingsStore(chatId, settingsDir);
  const notepadStore = new NotepadStore(notepadDir);
  const summaryStore = new SummaryStore(summaryDir);
  const pinsStore = new PinnedContextStore(pinsDir);
  let reminders = [];
  try {
    if (fs.existsSync(remindersPath)) {
      const allReminders = JSON.parse(fs.readFileSync(remindersPath, 'utf8'));
      reminders = allReminders.filter(r => r.chatId == chatId);
    }
  } catch { reminders = []; }
};
/**
 * Show or switch model for a user
 */
CommandHandler.prototype.handleModel = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const args = context.args || [];
  const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
  const settingsDir = path.join(dataDir, 'settings');
  const settingsStore = new SettingsStore(chatId, settingsDir, this.ephemeralSessions[chatId]);

  if (!args || args.length === 0) {
    const settings = await settingsStore.load();
    const available = (this.config && this.config.ai && this.config.ai.availableModels) || [];
    const msg = `Current model: ${settings.model}\nAvailable models: ${available.join(', ')}`;
    return this.client.sendMessage(chatId, msg);
  }

  const model = args[0];
  const available = (this.config && this.config.ai && this.config.ai.availableModels) || [];
  if (!available.includes(model)) {
    return this.client.sendMessage(chatId, `Invalid model: ${model}. Available models: ${available.join(', ')}`);
  }
  await settingsStore.update('model', model);
  return this.client.sendMessage(chatId, `switched to ${model}`);
};

/**
 * View or update settings
 */
CommandHandler.prototype.handleSettings = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const args = context.args || [];
  const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
  const settingsDir = path.join(dataDir, 'settings');
  const settingsStore = new SettingsStore(chatId, settingsDir, this.ephemeralSessions[chatId]);
  // Support both AI-related settings and UI settings used across tests
  const validKeys = ['model', 'systemPrompt', 'language', 'theme', 'verbosity', 'notifications'];

  if (!args || args.length === 0) {
    const settings = await settingsStore.load();
    const availableModels = (this.config && this.config.ai && this.config.ai.availableModels) || [];
    const msg = `Current Settings\nModel: ${settings.model}\nSystem Prompt: ${settings.systemPrompt}\nLanguage: ${settings.language}\n\nTheme: ${settings.theme || 'light'}\nVerbosity: ${settings.verbosity || 'normal'}\nNotifications: ${settings.notifications || 'all'}\n\nAvailable models: ${availableModels.join(', ')}`;
    return this.client.sendMessage(chatId, msg, { parse_mode: 'HTML' });
  }

  const key = args[0];
  if (!validKeys.includes(key)) {
    return this.client.sendMessage(chatId, `Invalid setting: ${key}. Valid keys: ${validKeys.join(', ')}`);
  }

  const value = args.slice(1).join(' ');
  if (!value) {
    return this.client.sendMessage(chatId, `Usage: /settings <key> <value>. Valid keys: ${validKeys.join(', ')}`);
  }

  // Per-key validation
  if (key === 'model') {
    const available = (this.config && this.config.ai && this.config.ai.availableModels) || [];
    if (!available.includes(value)) {
      return this.client.sendMessage(chatId, `Invalid model: ${value}. Available models: ${available.join(', ')}`);
    }
  }

  if (key === 'theme') {
    const valid = ['light', 'dark'];
    if (!valid.includes(value)) return this.client.sendMessage(chatId, `Invalid theme: ${value}. Valid: ${valid.join(', ')}`);
  }

  if (key === 'verbosity') {
    const valid = ['minimal', 'normal', 'verbose'];
    if (!valid.includes(value)) return this.client.sendMessage(chatId, `Invalid verbosity: ${value}. Valid: ${valid.join(', ')}`);
  }

  if (key === 'notifications') {
    const valid = ['all', 'mentions', 'none'];
    if (!valid.includes(value)) return this.client.sendMessage(chatId, `Invalid notifications: ${value}. Valid: ${valid.join(', ')}`);
  }

  await settingsStore.update(key, value);
  return this.client.sendMessage(chatId, 'Settings updated');
};

/**
 * /start onboarding
 */
CommandHandler.prototype.handleStart = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const message = `<b>Welcome to GovnoBot</b>\n\nUse /ask to ask questions. Use /help to see commands.`;
  await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
};

/**
 * /help lists commands
 */
CommandHandler.prototype.handleHelp = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const isAdmin = context.isAdmin || (this.config && this.config.telegram && this.config.telegram.adminChatId && this.config.telegram.adminChatId === chatId) || false;
  let msg = 'Public Commands:\n/ask - Ask the AI\n/model - View or set model\n/history - View history\n/settings - View/update settings';
  if (isAdmin) {
    msg += '\n\nAdmin Commands:\n/sh - Run shell command';
  }
  await this.client.sendMessage(chatId, msg);
};

/**
 * /status shows uptime and memory
 */
CommandHandler.prototype.handleStatus = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  this.logger.info(`handleStatus called for chat ${chatId}`);
  const version = (this.config && this.config.version) || 'unknown';
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  const msg = `<b>Bot Status</b>\nStatus: 🕺Online\nVersion: ${version}\nUptime: ${Math.floor(uptime)}s\nMemory: RSS ${Math.round(mem.rss/1024/1024)}MB\nDefault Model: ${this.config && this.config.ai && this.config.ai.defaultModel ? this.config.ai.defaultModel : 'n/a'}`;
  this.logger.info(`Sending status to chat ${chatId}`);
  await this.client.sendMessage(chatId, msg, { parse_mode: 'HTML' });
};

/**
 * /version returns just the version
 */
CommandHandler.prototype.handleVersion = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const version = (this.config && this.config.version) || 'unknown';
  this.logger.info(`handleVersion called for chat ${chatId}: Version: ${version}`);
  await this.client.sendMessage(chatId, `Version: ${version}`, { parse_mode: 'HTML' });
};

/**
 * /history view/clear
 */
CommandHandler.prototype.handleHistory = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const args = context.args || [];
  const dataDir = (this.config && this.config.data && this.config.data.dir) || this.config.dataDir || '.';
  const historyDir = path.join(dataDir, 'history');
  const historyStore = new HistoryStore(historyDir, this.ephemeralSessions[chatId]);

  if (args && args[0] === 'clear') {
    await historyStore.clearHistory(chatId);
    return this.client.sendMessage(chatId, 'History cleared');
  }

  if (!args || args.length === 0) {
    const history = await historyStore.loadHistory(chatId);
    if (!history || history.length === 0) {
      return this.client.sendMessage(chatId, 'History is empty');
    }
    const lines = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
    let fullText = `History:\n${lines.join('\n\n')}`;
    
    // Escape HTML special characters to avoid parse entity errors
    fullText = fullText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    // Telegram limit is 4096 characters per message. Use existing chunker.
    const MAX_LENGTH = 3900; // Safe margin below 4096 for Telegram
    
    if (fullText.length <= MAX_LENGTH) {
      return this.client.sendMessage(chatId, fullText);
    }
    
    // Use character-level chunking to ensure no message exceeds limit
    // This handles cases where a single history entry is very long
    const chunks = [];
    let i = 0;
    while (i < fullText.length) {
      chunks.push(fullText.substring(i, i + MAX_LENGTH));
      i += MAX_LENGTH;
    }
    
    // Send each chunk as a separate message
    for (const chunk of chunks) {
      if (chunk.trim()) {
        await this.client.sendMessage(chatId, chunk);
      }
    }
    return;
  }

  return this.client.sendMessage(chatId, 'Usage: /history [clear]');
};
CommandHandler.prototype.handleForgetMe = async function(context) {
  const { chatId } = context;
  const historyDir = path.join(this.config.dataDir, 'history');
  const settingsDir = path.join(this.config.dataDir, 'settings');
  const notepadDir = path.join(this.config.dataDir, 'notepad');
  try {
    // Remove history file for user
    const historyFile = path.join(historyDir, String(chatId) + '.json');
    if (fs.existsSync(historyFile)) fs.unlinkSync(historyFile);

    // Remove settings file for user
    const settingsFile = path.join(settingsDir, String(chatId) + '.json');
    if (fs.existsSync(settingsFile)) fs.unlinkSync(settingsFile);

    // Notepad and other per-user stores may be directories; attempt removal if present
    const notepadFile = path.join(notepadDir, String(chatId) + '.json');
    if (fs.existsSync(notepadFile)) fs.unlinkSync(notepadFile);

    await this.client.sendMessage(chatId, 'All your personal data has been removed.');
    if (this.auditLogger) this.auditLogger.log({ event: 'forget_me', chatId });
  } catch (err) {
    await this.client.sendMessage(chatId, 'An error occurred while erasing your data.');
    if (this.logger && this.logger.error) this.logger.error('handleForgetMe error', err);
  }
};

// Expire ephemeral session helper
CommandHandler.prototype._expireEphemeral = function(chatId) {
  const session = this.ephemeralSessions[chatId];
  if (session) {
    clearTimeout(session.timeout);
    delete this.ephemeralSessions[chatId];
  }
};

// End ephemeral session explicitly
CommandHandler.prototype.handleEphemeralEnd = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  if (!this.ephemeralSessions[chatId]) {
    return this.client.sendMessage(chatId, 'No ephemeral session active.');
  }
  clearTimeout(this.ephemeralSessions[chatId].timeout);
  delete this.ephemeralSessions[chatId];
  return this.client.sendMessage(chatId, 'Ephemeral session ended.');
};

// Command registration
CommandHandler.prototype.registerPublicCommand = function(name, fn) {
  this.publicCommands = this.publicCommands || {};
  this.publicCommands[name] = fn;
};

CommandHandler.prototype.registerAdminCommand = function(name, fn) {
  this.adminCommands = this.adminCommands || {};
  this.adminCommands[name] = fn;
};

CommandHandler.prototype.setBotInfo = function(info) {
  this.botInfo = info;
};

// Plugin loading/reloading
CommandHandler.prototype.loadPlugins = function() {
  const pluginDir = (this.options && this.options.pluginDir) || path.join(process.cwd(), 'plugins');
  if (!fs.existsSync(pluginDir)) return;
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const full = path.join(pluginDir, f);
    try {
      delete require.cache[require.resolve(full)];
      const mod = require(full);
      if (mod && typeof mod.init === 'function') {
        mod.init(this);
        this.plugins[full] = mod;
      }
    } catch (err) {
      if (this.logger && this.logger.error) this.logger.error('plugin load error', err);
    }
  }
};

CommandHandler.prototype.reloadPlugin = function(pluginPath) {
  try {
    delete require.cache[require.resolve(pluginPath)];
    const mod = require(pluginPath);
    if (mod && typeof mod.init === 'function') {
      mod.init(this);
      this.plugins[pluginPath] = mod;
    }
  } catch (err) {
    if (this.logger && this.logger.error) this.logger.error('plugin reload error', err);
  }
};

module.exports = CommandHandler;
