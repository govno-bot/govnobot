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
const logsCommand = require('./admin/command-logs');

/**
 * Command Handler
 * Routes incoming messages to appropriate command handlers
 */

class CommandHandler {
  constructor(client, config, logger, rateLimiter, fallbackChain, auditLogger, reminderStore, notepadStore) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.fallbackChain = fallbackChain;
    this.auditLogger = auditLogger;
    this.reminderStore = reminderStore;
    this.notepadStore = notepadStore;
    this.botInfo = null;

    // Map of commands to handler functions
    this.publicCommands = new Map();
    this.adminCommands = new Map();
    
    // For testing: allow exec to be mocked
    this.exec = require('child_process').exec;
    
    this.registerDefaultCommands();
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
        return;
      }
    }

    // We proceed processing 'text' as if it was a text message
    if (!text) return; // If it's still empty (e.g., sticker, video)

    // Check if message starts with a command
    if (!text.startsWith('/')) {
      // Check for inline mention or reply
        let isMentioned = false;
        let query = text;

        if (this.botInfo) {
          // Check mention like @botname
          if (this.botInfo.username) {
            const mentionStr = `@${this.botInfo.username}`;
            if (text.toLowerCase().includes(mentionStr.toLowerCase())) {
              isMentioned = true;
              query = text.replace(new RegExp(mentionStr, 'ig'), '').trim();
            }
          }
          
          // Check if it's a direct reply to the bot
          if (!isMentioned && message.reply_to_message && message.reply_to_message.from) {
            if (message.reply_to_message.from.id === this.botInfo.id) {
              isMentioned = true;
            }
          }
        }

        if (isMentioned) {
          const args = query ? query.split(/\s+/) : [];
          try {
            await this.handleAsk({
              chatId,
              userId,
              username,
              text: query,
              command: 'ask',
              args,
              isAdmin: this.isAdmin(userId, username, chatId),
              message,
              update,
              reminderStore: this.reminderStore,
              telegramApiClient: this.client,
              logger: this.logger,
              isInlineMention: true
            });
          } catch (error) {
            const userMessage = handleError(error, {
              logger: this.logger,
              logMessage: `Error handling inline mention query`,
              context: { query, userId, chatId },
              userMessage: '❌ An error occurred processing your query. Please try again later.'
            });
            await this.client.sendMessage(chatId, userMessage);
          }
        }
        
        return;
      }    // Parse command
    const parts = text.split(/\s+/);
    const commandName = parts[0].substring(1).toLowerCase(); // Remove / and lowercase
    const args = parts.slice(1);
    
    // Check if user is admin
    const isAdmin = this.isAdmin(userId, username, chatId);
    
    // Find command handler
    let handler = null;
    let isAdminCommand = false;
    
    if (this.adminCommands.has(commandName)) {
      if (!isAdmin) {
        await this.client.sendMessage(chatId, '❌ This command is restricted to administrators.');
        return;
      }
      handler = this.adminCommands.get(commandName);
      isAdminCommand = true;
      
      // Log audit for admin actions
      if (this.auditLogger) {
        this.auditLogger.log(
          { id: userId, username },
          commandName,
          { args }
        );
      }
    } else if (this.publicCommands.has(commandName)) {
      handler = this.publicCommands.get(commandName);
    } else {
      // Unknown command - escape command name for display
      const safeCommand = commandName
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
      await this.client.sendMessage(
        chatId,
        `❌ Unknown command: /${safeCommand}\n\nUse /help for available commands.`
      );
      return;
    }
    
    // Execute command handler
    try {
      await handler({
        chatId,
        userId,
        username,
        text,
        command: commandName,
        args,
        isAdmin,
        message,
        update,
        reminderStore: this.reminderStore,
        telegramApiClient: this.client,
        logger: this.logger,
        config: this.config,
        fallbackChain: this.fallbackChain
      });
    } catch (error) {
      const userMessage = handleError(error, {
        logger: this.logger,
        logMessage: `Error handling command /${commandName}`,
        context: {
          command: commandName,
          args,
          userId,
          chatId
        },
        userMessage: '❌ An error occurred processing your command. Please try again later.'
      });
      
      await this.client.sendMessage(chatId, userMessage);
    }
  }

  /**
   * Check if a user is admin
   */
  isAdmin(userId, username, chatId) {
    const adminUsername = this.config.telegram.adminUsername;
    const adminChatId = this.config.telegram.adminChatId;
    
    if (adminChatId && chatId === adminChatId) {
      return true;
    }
    
    if (adminUsername && username === adminUsername) {
      return true;
    }
    
    return false;
  }

  /**
   * Handle /start command
   */
  async handleStart(context) {
    const { chatId } = context;
    
    const message = `
🤖 <b>Welcome to GovnoBot!</b>

I'm a Telegram bot that helps you with questions and provides AI-powered assistance.

<b>Available Commands:</b>
/ask &lt;query&gt; - Ask me a question
/help - Show this help message
/model - Switch AI models
/settings - Configure your preferences
/history - View your conversation history
/status - Bot status

Use /help for more information.
    `.trim();
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /help command
   */
  async handleHelp(context) {
    const { chatId, isAdmin } = context;
    const availableModels = await this.getAvailableModels();
    
    let message = `
<b>GovnoBot Commands</b>

<b>Public Commands:</b>
/ask &lt;query&gt; - Ask a question
/fix &lt;query&gt; - Fix a problem
/model - Change AI model
/settings - View/change settings
/history - View conversation history
/status - Show bot status
/help - Show this message

<b>Available Models:</b>
${availableModels.join(', ')}
    `.trim();
    
    if (isAdmin) {
      message += `

<b>Admin Commands:</b>
/sh &lt;command&gt; - Execute shell command
/audit - View audit log
      `;
    }
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /ask command
   */
  async handleAsk(context) {
    const { chatId, args, isInlineMention } = context;

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
    
    // Save user message to history
    const historyDir = path.join(this.config.dataDir, 'history');
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

      // Call AI service
      const answer = await this.fallbackChain.call(question);
      
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
    const settingsDir = path.join(this.config.dataDir, 'settings');
    let settings;
    try {
      const store = new SettingsStore(chatId, settingsDir);
      settings = await store.load();
    } catch (err) {
      this.logger.error(`Error loading settings for user ${chatId}`, err);
      settings = { model: this.config.ai.defaultModel };
    }
    
    // Fetch available models dynamically
    const availableModels = await this.getAvailableModels();
    
    if (args.length === 0) {
      const models = availableModels.join('\n');
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
    
    if (!availableModels.includes(selectedModel)) {
      await this.client.sendMessage(
        chatId,
        `❌ Invalid model: ${selectedModel}\n\nAvailable models: ${availableModels.join(', ')}`
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
    const settingsDir = path.join(this.config.dataDir, 'settings');
    let settings;

    // Load settings
    try {
      const store = new SettingsStore(chatId, settingsDir);
      settings = await store.load();
    } catch (err) {
      this.logger.error(`Error loading settings for user ${chatId}`, err);
      settings = { 
        model: this.config.ai.defaultModel,
        systemPrompt: 'You are a helpful assistant.'
      };
    }
    
    // View settings
    if (args.length === 0) {
      const message = `
<b>Current Settings:</b>

Model: ${settings.model || this.config.ai.defaultModel}
System Prompt: ${settings.systemPrompt || 'You are a helpful assistant.'}

To change a setting, use:
/settings &lt;key&gt; &lt;value&gt;

Examples:
/settings model mistral
/settings systemPrompt You are a pirate.
      `.trim();
      
      await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return;
    }
    
    // Update setting
    const key = args[0]
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    let value = args.slice(1).join(' ');

    if (!value) {
      await this.client.sendMessage(chatId, `❌ Usage: /settings ${key} &lt;value&gt;`);
      return;
    }

    // Validation
    // Remove HTML encoding from input for checking
    const rawKey = key.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    
    if (rawKey === 'model') {
      value = value.toLowerCase();
      const availableModels = await this.getAvailableModels();
      
      if (!availableModels.includes(value)) {
        await this.client.sendMessage(
          chatId,
          `❌ Invalid model: ${value}\n\nAvailable models: ${availableModels.join(', ')}`
        );
        return;
      }
    } else if (rawKey === 'systemPrompt') {
      // Any string is valid for systemPrompt, trim it
      value = value.trim();
    } else {
      await this.client.sendMessage(
        chatId,
        `❌ Invalid setting key: ${key}\n\nValid keys: model, systemPrompt`
      );
      return;
    }

    // Save
    try {
      const store = new SettingsStore(chatId, settingsDir);
      await store.update(rawKey, value); // Use raw key for storage
      await this.client.sendMessage(chatId, `✓ Settings updated: ${key} set.`); // Use safe key for display
    } catch (err) {
      this.logger.error(`Error saving setting ${key} for user ${chatId}`, err);
      await this.client.sendMessage(chatId, `❌ Failed to update setting: ${key}`);
    }
  }

  /**
   * Handle /history command
   */
  async handleHistory(context) {
    const { chatId, args } = context;
    
    // Initialize store
    const historyDir = path.join(this.config.dataDir, 'history');
    const store = new HistoryStore(historyDir);
    
    // Subcommand: clear
    if (args.length > 0 && args[0].toLowerCase() === 'clear') {
      try {
        await store.clearHistory(chatId);
        await this.client.sendMessage(chatId, '🗑️ Conversation history cleared.');
      } catch (error) {
        this.logger.error(`Error clearing history for user ${chatId}`, error);
        await this.client.sendMessage(chatId, '❌ Failed to clear history.');
      }
      return;
    }
    
    // Invalid args
    if (args.length > 0) {
      await this.client.sendMessage(chatId, '❌ Usage:\n/history - View recent history\n/history clear - Clear history');
      return;
    }
    
    try {
      // Load last 10 messages
      const messages = await store.loadHistory(chatId, 10);
      
      if (!messages || messages.length === 0) {
        await this.client.sendMessage(chatId, '📜 Your conversation history is empty.\n\nStart by asking: /ask &lt;question&gt;');
        return;
      }
      
      let response = '<b>📜 Recent Conversation History:</b>\n\n';
      
      messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'You' : 'Bot';
        let content = msg.content || '';
        
        // Truncate if too long
        if (content.length > 100) {
          content = content.substring(0, 97) + '...';
        }
        
        // Escape HTML
        content = content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
          
        response += `<b>${role}:</b> ${content}\n\n`;
      });
      
      response += '<i>To clear history, use: /history clear</i>';
      
      await this.client.sendMessage(chatId, response, { parse_mode: 'HTML' });
      
    } catch (error) {
      this.logger.error(`Error listing history for user ${chatId}`, error);
      await this.client.sendMessage(chatId, '❌ Failed to retrieve history.');
    }
  }

  /**
   * Handle /status command
   */
  async handleStatus(context) {
    const { chatId } = context;
    
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const message = `
<b>Bot Status</b>

Version: ${this.config.version}
Status: 🟢 Online
Uptime: ${hours}h ${minutes}m
Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
Default Model: ${this.config.ai.defaultModel}
    `.trim();
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /sh command (admin only)
   */
  async handleShellCommand(context) {
    const { chatId, username, args } = context;
    const MAX_OUTPUT = 3500; // Telegram safe size
    const whitelist = this.config.security.shCommandWhitelist;
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /sh &lt;command&gt; \nAvaliable commands:\n'+whitelist.join('\n'));
      return;
    }
    const command = args.join(' ');
    const firstWord = args[0].toLowerCase();
    if (whitelist.length > 0 && !whitelist.includes(firstWord)) {
      this.logAuditAction(chatId, username, '/sh', command, 'DENIED', 'Command not whitelisted');
      await this.client.sendMessage(chatId, `❌ Command not whitelisted: ${firstWord}`);
      return;
    }
    // Execute shell command (Node.js built-in only)
    await this.client.sendChatAction(chatId, 'typing');
    
    // Wrap exec in promise to await completion
    await new Promise((resolve) => {
      this.exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, async (error, stdout, stderr) => {
        let output = '';
        if (error) {
          output = `❌ Error: ${error.message}`;
        } else if (stderr) {
          output = `⚠️ Stderr: ${stderr}\n` + stdout;
        } else {
          output = stdout;
        }
        if (!output) output = '(no output)';
        if (output.length > MAX_OUTPUT) {
          output = output.slice(0, MAX_OUTPUT) + '\n...output truncated...';
        }
        await this.client.sendMessage(chatId, '```\n' + output + '\n```', { parse_mode: 'Markdown' });
        this.logAuditAction(chatId, username, '/sh', command, 'EXECUTED', error ? error.message : null);
        resolve();
      });
    });
  }

  /**
   * Handle /agent command (admin only)
   */
  async handleAgentCommand(context) {
    const { chatId, username, args } = context;
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /agent &lt;prompt&gt;');
      return;
    }
    const prompt = args.join(' ');
    await this.client.sendChatAction(chatId, 'typing');
    
    let response = `🤖 [Agent] Goal added:\n${prompt}`;
    try {
      if (this.notepadStore) {
        const notepad = await this.notepadStore.load();
        const goals = Array.isArray(notepad.goals) ? notepad.goals : [];
        goals.push(prompt);
        await this.notepadStore.update({ goals });
      } else {
        response = `⚠️ Warning: notepadStore not available. Goal was not saved.`;
      }
    } catch (err) {
      this.logger.error('Failed to update notepad for /agent command', err);
      response = `❌ Failed to save goal to agent notepad.`;
    }

    response = response
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    await this.client.sendMessage(chatId, response);
    this.logAuditAction(chatId, username, '/agent', prompt, 'EXECUTED', null);
  }

  /**
   * Handle /audit command (admin only)
   */
  async handleAudit(context) {
    const { chatId } = context;
    
    const message = '📋 Audit log functionality coming soon...';
    await this.client.sendMessage(chatId, message);
  }

  /**
   * Log an admin action
   */
  logAuditAction(chatId, username, command, details, status, reason) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] COMMAND: ${command} | ADMIN: @${username} | CHATID: ${chatId} | STATUS: ${status}`;
    
    if (reason) {
      this.logger.warn(`${logEntry} | REASON: ${reason}`);
    } else {
      this.logger.info(logEntry);
    }
  }

  /**
   * Get all available models (configured + dynamic)
   */
  async getAvailableModels() {
    let dynamicModels = [];
    if (this.fallbackChain && typeof this.fallbackChain.listModels === 'function') {
      try {
        dynamicModels = await this.fallbackChain.listModels();
      } catch (err) {
        this.logger.warn('Failed to fetch dynamic models', err);
      }
    }
    
    // If we have dynamic models (from Ollama/OpenAI), use them as the source of truth
    if (dynamicModels.length > 0) {
      return Array.from(new Set(dynamicModels));
    }

    // Fallback to config if discovery failed completely
    return Array.from(new Set(this.config.ai.availableModels));
  }
}

module.exports = CommandHandler;
