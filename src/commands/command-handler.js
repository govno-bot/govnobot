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
  constructor(client, config, logger, rateLimiter, fallbackChain, auditLogger, reminderStore, notepadStore, options = {}) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.fallbackChain = fallbackChain;
    this.auditLogger = auditLogger;
    this.reminderStore = reminderStore;
    this.notepadStore = notepadStore;
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
  }

  /**
   * Main command dispatcher (simplified for patch)
   */
  async handle(context) {
    const text = (context.text || '').trim();
    const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
    // Rate limiting: short-circuit if present
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
      // Admin commands check
      const from = context.message.from || {};
      const isAdmin = (from.username && this.config && this.config.telegram && from.username === this.config.telegram.adminUsername) || (this.config && this.config.telegram && this.config.telegram.adminChatId && from.id === this.config.telegram.adminChatId);

      if (this.publicCommands[cmd]) {
        try {
          await this.publicCommands[cmd]({ chatId, args, message: context.message, telegramApiClient: this.client, config: this.config });
        } catch (err) {
          await this.client.sendMessage(chatId, 'An error occurred processing your command');
        }
        return;
      }

      if (this.adminCommands[cmd]) {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        try {
          await this.adminCommands[cmd]({ chatId, args, message: context.message, telegramApiClient: this.client, config: this.config });
        } catch (err) {
          await this.client.sendMessage(chatId, 'An error occurred processing your command');
        }
<<<<<<< HEAD
=======
      };

      // Create plugin-scoped registration helpers
      const pluginApi = {
        registerPublicCommand: (name, handler) => {
          this.registerPublicCommandForPlugin(name, handler, pluginPath);
          record.commands.public.add(name.toLowerCase());
        },
        registerAdminCommand: (name, handler) => {
          this.registerAdminCommandForPlugin(name, handler, pluginPath);
          record.commands.admin.add(name.toLowerCase());
        },
        config: this.config,
        logger: this.logger,
        client: this.client,
        fallbackChain: this.fallbackChain
      };

      this.plugins.set(pluginPath, record);
      pluginModule.init(pluginApi);
      this.logger?.info(`Loaded plugin: ${pluginName}`);
    } catch (err) {
      this.logger?.error(`Error loading plugin ${pluginPath}`, err);
    }
  }

  registerPublicCommandForPlugin(name, handler, pluginPath) {
    this.registerPublicCommand(name, handler);
  }

  registerAdminCommandForPlugin(name, handler, pluginPath) {
    this.registerAdminCommand(name, handler);
  }

  /**
   * Register built-in commands
   */
  registerDefaultCommands() {
    // Public commands
    this.registerPublicCommand('start', this.handleStart.bind(this));
    this.registerPublicCommand('help', this.handleHelp.bind(this));
    this.registerPublicCommand('ask', this.handleAsk.bind(this));
    this.registerPublicCommand('fix', this.handleFix.bind(this));
    this.registerPublicCommand('model', this.handleModel.bind(this));
    this.registerPublicCommand('settings', this.handleSettings.bind(this));
    this.registerPublicCommand('history', this.handleHistory.bind(this));
    this.registerPublicCommand('stats', this.handleStats.bind(this));
    this.registerPublicCommand('status', this.handleStatus.bind(this));
    this.registerPublicCommand('version', this.handleVersion.bind(this));

    // Admin helper command: send message to Jack via local automation script
    this.registerAdminCommand('jack', this.handleJackCommand.bind(this));

    this.registerPublicCommand(remindCommand.name, remindCommand.handler);
    this.registerPublicCommand(personaCommand.name, personaCommand.handler);
    this.registerPublicCommand(gmCommand.name, gmCommand.handler);
    this.registerPublicCommand(imagineCommand.name, imagineCommand.handler);

    // Admin Commands
    this.registerAdminCommand('sh', this.handleShellCommand.bind(this));        
    this.registerAdminCommand('agent', this.handleAgentCommand.bind(this));     
    this.registerAdminCommand('audit', this.handleAudit.bind(this));
    this.registerAdminCommand(logsCommand.name, logsCommand.handler);
  }

  /**
   * Get commands for the bot menu (setMyCommands)
   * Returns array of {command, description} objects for public commands
   */
  getMenuCommands() {
    const menuCommands = [
      { command: 'start', description: 'Start the bot and get welcome message' },
      { command: 'help', description: 'Show all available commands' },
      { command: 'ask', description: 'Ask a question to AI' },
      { command: 'fix', description: 'Get AI-powered fix suggestions' },
      { command: 'model', description: 'View or change AI model' },
      { command: 'settings', description: 'View or update your settings' },
      { command: 'history', description: 'View your conversation history' },
      { command: 'status', description: 'Show bot status and uptime' },
      { command: 'version', description: 'Show bot version' },
      { command: 'remind', description: 'Set a reminder' },
      { command: 'persona', description: 'Set bot personality' },
      { command: 'gm', description: 'Game Master mode for storytelling' },
      { command: 'imagine', description: 'Generate images with AI' },
    ];

    // Only include commands that are actually registered
    return menuCommands.filter(cmd => this.publicCommands.has(cmd.command.toLowerCase()));
  }

  /**
   * Handle /fix command
   */
  async handleFix(context) {
    const { chatId, args } = context;
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /fix &lt;problem description&gt;');
      return;
    }
    const problem = args.join(' ')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    await this.client.sendChatAction(chatId, 'typing');
    // Placeholder response
    const response = `🛠️ Problem: "${problem}"
\nAI-powered fix coming soon...`;
    await this.client.sendMessage(chatId, response);
  }

  /**
   * Handle /stats command
   */
  async handleStats(context) {
    // For now, just call handleStatus
    await this.handleStatus(context);
  }

  /**
   * Handle /version command
   */
  async handleVersion(context) {
    const { chatId } = context;
    const message = `🤖 GovnoBot version: <b>${this.config.version}</b>`;
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }
  /**
   * Register a public command
   */
  registerPublicCommand(name, handler) {
    this.publicCommands.set(name.toLowerCase(), handler);
  }

  /**
   * Register an admin command
   */
  registerAdminCommand(name, handler) {
    this.adminCommands.set(name.toLowerCase(), handler);
  }

  /**
   * Set bot info obtained from Telegram API
   */
  setBotInfo(botInfo) {
    this.botInfo = botInfo;
  }

  /**
   * Handle an incoming update
   */
  async handle(update) {
    if (!update.message) {
      return;
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || 'unknown';
    let text = message.text || '';

    this.logger.debug(`Message from @${username}: ${text}`);

    // Check rate limit
    if (this.rateLimiter && !this.rateLimiter.isAllowed(chatId)) {
      const status = this.rateLimiter.getStatus(chatId);
      const isHourLimit = status.remainingHour === 0;
      const waitTime = isHourLimit ? `${status.hoursUntilReset} hour(s)` : `${status.minutesUntilReset} minute(s)`;
      
      this.logger.warn(`Rate limit exceeded for chat ${chatId}`);
      await this.client.sendMessage(
        chatId,
        `⚠️ <b>Rate limit exceeded.</b>\n\nYou are sending too many requests. Please wait ${waitTime} before trying again.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Process Voice Messages
    if (message.voice) {
      this.logger.info(`Received voice message from user ${userId}`);
      try {
        await this.client.sendChatAction(chatId, 'typing');
        const fileInfo = await this.client.getFile(message.voice.file_id);
        const filePath = fileInfo.result.file_path;
        const audioBuffer = await this.client.downloadFile(filePath);
        const filename = path.basename(filePath) || 'voice.ogg';
        
        text = await this.fallbackChain.transcribeAudio(audioBuffer, filename);
        if (!text || text.trim().length === 0) {
          throw new Error('Transcription resulted in empty text');
        }
        
        // Let the user know we transcribed it
        await this.client.sendMessage(chatId, `🎤 <i>Transcript:</i> ${text}`, { parse_mode: 'HTML' });
      } catch (err) {
        this.logger.error(`Voice transcription failed: ${err.message}`);
        await this.client.sendMessage(chatId, `⚠️ Failed to transcribe voice message. Please send text instead.`);
>>>>>>> 069fad8534b0c8182f6c294422e1eba3cbbe2cc7
        return;
      }

      // Built-in admin commands
      if (cmd === 'sh') {
        if (!isAdmin) return this.client.sendMessage(chatId, 'This command is restricted to admins');
        const whitelist = (this.config && this.config.security && this.config.security.shCommandWhitelist) || [];
        const cmdName = args && args.length > 0 ? args[0] : '';
        if (whitelist.length > 0 && !whitelist.includes(cmdName)) {
          return this.client.sendMessage(chatId, `Command not whitelisted: ${cmdName}. Allowed: ${whitelist.join(', ')}`);
        }
        const commandStr = args.join(' ');
        const execFn = this.exec || require('child_process').exec;
        try {
          await new Promise((resolve) => {
            execFn(commandStr, {}, async (err, stdout, stderr) => {
              try {
                if (err) {
                  await this.client.sendMessage(chatId, `Error: ${err.message}`);
                } else {
                  let out = stdout || '';
                  const limit = 2000;
                  if (out.length > limit) {
                    out = out.slice(0, limit) + '\n\n(truncated)';
                  }
                  await this.client.sendMessage(chatId, out || '(no output)');
                }
              } catch (e) {
                // ignore
              }
              resolve();
            });
          });
        } catch (err) {
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

      if (cmd === 'status') {
        return this.handleStatus({ chatId, message: context.message });
      }

      if (cmd === 'version') {
        return this.handleVersion({ chatId, message: context.message });
      }

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

<<<<<<< HEAD
    try {
      // Support streaming responses via onToken/isAborted
      let aborted = false;
      const isAborted = () => aborted;
      if (typeof context.setAbortHandler === 'function') {
        context.setAbortHandler(() => { aborted = true; });
      }

      const tokensBuffer = [];
      const onToken = async (t) => {
        tokensBuffer.push(t);
        // Send each token as a separate message (tests concatenate)
        await this.client.sendMessage(chatId, String(t));
=======
    if (args.length === 0) {
      if (isInlineMention) {
        await this.client.sendMessage(chatId, '🤖 Hi! How can I help you?');
      } else {
        await this.client.sendMessage(chatId, '❌ Usage: /ask &lt;your question&gt;');
      }
      return;
    }

    const question = args.join(' ');    // Show typing indicator
    await this.client.sendChatAction(chatId, 'typing');
    
    // Load user settings (for model, system prompt, and language)
    const settingsDir = path.join(this.config.data.dir, 'settings');
    let settings = { model: this.config.ai.defaultModel, systemPrompt: 'You are a helpful assistant.', language: 'en' };
    try {
      const store = new SettingsStore(chatId, settingsDir);
      settings = await store.load();
    } catch (err) {
      this.logger.error(`Error loading settings for user ${chatId} during /ask`, err);
    }
    
    // Save user message to history
    const historyDir = path.join(this.config.data.dir, 'history');
    const historyStore = new HistoryStore(historyDir);
    
    try {
      await historyStore.addMessage(chatId, 'user', question);
    } catch (err) {
      this.logger.error(`Error saving user message to history for ${chatId}`, err);
    }
    
    try {
      if (!this.fallbackChain) {
        throw new Error('AI service not configured');
      }

      // Build prompt with optional system prompt and language preference
      const language = (settings.language || 'en').toLowerCase();
      const messages = [];
      if (settings.systemPrompt) {
        messages.push({ role: 'system', content: settings.systemPrompt });
      }
      let userPrompt = question;
      if (language && language !== 'en') {
        userPrompt = `Please answer the following question in ${language}:\n\n${question}`;
      }
      messages.push({ role: 'user', content: userPrompt });

      // Call AI service using the user's preferred model
      const answer = await this.fallbackChain.call(messages, { model: settings.model });
      
      // Save assistant message to history
      try {
        await historyStore.addMessage(chatId, 'assistant', answer);
      } catch (err) {
        this.logger.error(`Error saving assistant message to history for ${chatId}`, err);
      }
      
      // Split long messages
      const chunks = chunk(answer);
      
      for (const msgChunk of chunks) {
        await this.client.sendMessage(chatId, msgChunk);
      }
      
    } catch (error) {
      this.logger.error('Error handling /ask', error);
      await this.client.sendMessage(
        chatId,
        'sorry, I encountered an error getting an answer. Please try again later.'
      );
    }
  }

  /**
   * Handle /model command
   */
  async handleModel(context) {
    const { chatId, args } = context;
    const settingsDir = path.join(this.config.data.dir, 'settings');
    let settings;
    try {
      const store = new SettingsStore(chatId, settingsDir);
      settings = await store.load();
    } catch (err) {
      this.logger.error(`Error loading settings for user ${chatId}`, err);
      settings = { model: this.config.ai.defaultModel };
    }
    
    // Fetch available models dynamically (array of objects)
    const availableModels = await this.getAvailableModels();
    
    if (args.length === 0) {
      const models = availableModels.map(m => `${m.id} — ${m.provider} (${m.source})`).join('\n');
      const message = `
<b>Available AI Models:</b>
${models}

<b>Current model:</b> ${settings.model || this.config.ai.defaultModel}

Use: /model &lt;model_name&gt;
      `.trim();
      await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return;
    }
    
    const selectedModel = args[0].toLowerCase()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Normalize available model ids for matching
    const normalizedIds = availableModels.map(m => String(m.id).toLowerCase());
    if (!normalizedIds.includes(selectedModel)) {
      await this.client.sendMessage(
        chatId,
        `❌ Invalid model: ${selectedModel}\n\nAvailable models: ${availableModels.map(m => m.id).join(', ')}`
      );
      return;
    }
    
    try {
      const store = new SettingsStore(chatId, settingsDir);
      await store.update('model', selectedModel);
      await this.client.sendMessage(chatId, `✓ Model switched to: ${selectedModel}`);
    } catch (err) {
      this.logger.error(`Error saving model setting for user ${chatId}`, err);
      await this.client.sendMessage(chatId, '❌ Failed to update model setting.');
    }
  }

  /**
   * Handle /settings command
   */
  async handleSettings(context) {
    const { chatId, args } = context;
    const settingsDir = path.join(this.config.data.dir, 'settings');
    let settings;

    // Load settings
    try {
      const store = new SettingsStore(chatId, settingsDir);
      settings = await store.load();
    } catch (err) {
      this.logger.error(`Error loading settings for user ${chatId}`, err);
      settings = { 
        model: this.config.ai.defaultModel,
        systemPrompt: 'You are a helpful assistant.',
        language: 'en'
>>>>>>> 069fad8534b0c8182f6c294422e1eba3cbbe2cc7
      };

      const chain = this.fallbackChain || context.fallbackChain;
      if (!chain || typeof chain.call !== 'function') {
        // No AI configured
        await this.client.sendMessage(chatId, 'No AI configured.');
        return;
      }

      const inputForChain = [{ role: 'user', content: prompt }];
      const result = await chain.call(inputForChain, { onToken, isAborted });

<<<<<<< HEAD
      // Persist to history: save user prompt and assistant response
=======
  /**
   * Handle /history command
   */
  async handleHistory(context) {
    const { chatId, args } = context;
    
    // Initialize store
    const historyDir = path.join(this.config.data.dir, 'history');
    const store = new HistoryStore(historyDir);
    
    // Subcommand: clear
    if (args.length > 0 && args[0].toLowerCase() === 'clear') {
>>>>>>> 069fad8534b0c8182f6c294422e1eba3cbbe2cc7
      try {
        const historyDir = path.join(this.config.dataDir || '.', 'history');
        const historyStore = new HistoryStore(historyDir, this.ephemeralSessions[chatId]);

        // Save user message
        await historyStore.addMessage(chatId, 'user', prompt);

        // Determine final assistant text
        let assistantText = '';
        if (Array.isArray(tokensBuffer) && tokensBuffer.length > 0) {
          assistantText = tokensBuffer.join('');
        }
        if (!assistantText && typeof result === 'string') assistantText = result;

        if (assistantText) {
          const chunks = typeof chunk === 'function' ? chunk(assistantText) : [assistantText];
          for (const c of chunks) {
            await this.client.sendMessage(chatId, c);
          }
          await historyStore.addMessage(chatId, 'assistant', assistantText);
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
  const historyDir = path.join(this.config.dataDir, 'history');
  const settingsDir = path.join(this.config.dataDir, 'settings');
  const notepadDir = path.join(this.config.dataDir, 'notepad');
  const summaryDir = path.join(this.config.dataDir, 'summary');
  const pinsDir = path.join(this.config.dataDir, 'pins');
  const remindersPath = path.join(this.config.dataDir, 'reminders.json');
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
  const settingsDir = path.join(this.config.dataDir || '.', 'settings');
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
  const settingsDir = path.join(this.config.dataDir || '.', 'settings');
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
  const version = (this.config && this.config.version) || 'unknown';
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  const msg = `<b>Bot Status</b>\nStatus: 🕺Online\nVersion: ${version}\nUptime: ${Math.floor(uptime)}s\nMemory: RSS ${Math.round(mem.rss/1024/1024)}MB\nDefault Model: ${this.config && this.config.ai && this.config.ai.defaultModel ? this.config.ai.defaultModel : 'n/a'}`;
  await this.client.sendMessage(chatId, msg, { parse_mode: 'HTML' });
};

/**
 * /version returns just the version
 */
CommandHandler.prototype.handleVersion = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const version = (this.config && this.config.version) || 'unknown';
  await this.client.sendMessage(chatId, `Version: ${version}`, { parse_mode: 'HTML' });
};

/**
 * /history view/clear
 */
CommandHandler.prototype.handleHistory = async function(context) {
  const chatId = context.chatId || (context.message && context.message.chat && context.message.chat.id);
  const args = context.args || [];
  const historyDir = path.join(this.config.dataDir || '.', 'history');
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
    return this.client.sendMessage(chatId, `History:\n${lines.join('\n\n')}`);
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
