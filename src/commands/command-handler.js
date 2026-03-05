/**
 * Command Handler
 * Routes incoming messages to appropriate command handlers
 */

class CommandHandler {
  constructor(client, config, logger, rateLimiter) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    
    // Map of commands to handler functions
    this.publicCommands = new Map();
    this.adminCommands = new Map();
    
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
    
    // Admin commands
    this.registerAdminCommand('sh', this.handleShellCommand.bind(this));
    this.registerAdminCommand('agent', this.handleAgentCommand.bind(this));
    this.registerAdminCommand('audit', this.handleAudit.bind(this));
  }

  /**
   * Handle /fix command
   */
  async handleFix(context) {
    const { chatId, args } = context;
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /fix <problem description>');
      return;
    }
    const problem = args.join(' ');
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
    const text = message.text || '';
    
    this.logger.debug(`Message from @${username}: ${text}`);
    
    // Check if message starts with a command
    if (!text.startsWith('/')) {
      // Regular message, not a command
      return;
    }
    
    // Parse command
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
    } else if (this.publicCommands.has(commandName)) {
      handler = this.publicCommands.get(commandName);
    } else {
      // Unknown command
      await this.client.sendMessage(
        chatId,
        `❌ Unknown command: /${commandName}\n\nUse /help for available commands.`
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
      });
    } catch (error) {
      this.logger.error(`Error handling command /${commandName}`, error);
      await this.client.sendMessage(
        chatId,
        '❌ An error occurred processing your command.'
      );
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
/ask <query> - Ask me a question
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
    
    let message = `
<b>GovnoBot Commands</b>

<b>Public Commands:</b>
/ask <query> - Ask a question
/fix <query> - Fix a problem
/model - Change AI model
/settings - View/change settings
/history - View conversation history
/status - Show bot status
/help - Show this message

<b>Available Models:</b>
${this.config.ai.availableModels.join(', ')}
    `.trim();
    
    if (isAdmin) {
      message += `

<b>Admin Commands:</b>
/sh <command> - Execute shell command
/audit - View audit log
      `;
    }
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /ask command
   */
  async handleAsk(context) {
    const { chatId, args } = context;
    
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /ask <your question>');
      return;
    }
    
    const question = args.join(' ');
    
    // Show typing indicator
    await this.client.sendChatAction(chatId, 'typing');
    
    // Placeholder response
    const response = `📚 Your question: "${question}"\n\nAI integration coming soon...`;
    
    await this.client.sendMessage(chatId, response);
  }

  /**
   * Handle /model command
   */
  async handleModel(context) {
    const { chatId, args } = context;
    
    if (args.length === 0) {
      const models = this.config.ai.availableModels.join('\n');
      const message = `
<b>Available AI Models:</b>
${models}

Use: /model <model_name>
      `.trim();
      await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return;
    }
    
    const selectedModel = args[0].toLowerCase();
    
    if (!this.config.ai.availableModels.includes(selectedModel)) {
      await this.client.sendMessage(
        chatId,
        `❌ Unknown model: ${selectedModel}\n\nAvailable: ${this.config.ai.availableModels.join(', ')}`
      );
      return;
    }
    
    // Placeholder - actual implementation will save to settings
    await this.client.sendMessage(chatId, `✓ Model switched to: ${selectedModel}`);
  }

  /**
   * Handle /settings command
   */
  async handleSettings(context) {
    const { chatId } = context;
    
    const message = `
<b>Your Settings:</b>

Model: ${this.config.ai.defaultModel}
Max History Context: 5 messages

Coming soon: More settings configuration
    `.trim();
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /history command
   */
  async handleHistory(context) {
    const { chatId } = context;
    
    const message = '📜 Your conversation history is empty.\n\nStart by asking: /ask <question>';
    
    await this.client.sendMessage(chatId, message);
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
    `.trim();
    
    await this.client.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Handle /sh command (admin only)
   */
  async handleShellCommand(context) {
    const { chatId, username, args } = context;
    const MAX_OUTPUT = 3500; // Telegram safe size
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /sh <command>');
      return;
    }
    const command = args.join(' ');
    const whitelist = this.config.security.shCommandWhitelist;
    const firstWord = args[0].toLowerCase();
    if (whitelist.length > 0 && !whitelist.includes(firstWord)) {
      this.logAuditAction(chatId, username, '/sh', command, 'DENIED', 'Command not whitelisted');
      await this.client.sendMessage(chatId, `❌ Command not whitelisted: ${firstWord}`);
      return;
    }
    // Execute shell command (Node.js built-in only)
    const { exec } = require('child_process');
    await this.client.sendChatAction(chatId, 'typing');
    exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, async (error, stdout, stderr) => {
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
    });
  }

  /**
   * Handle /agent command (admin only)
   */
  async handleAgentCommand(context) {
    const { chatId, username, args } = context;
    if (args.length === 0) {
      await this.client.sendMessage(chatId, '❌ Usage: /agent <prompt>');
      return;
    }
    const prompt = args.join(' ');
    await this.client.sendChatAction(chatId, 'typing');
    // Placeholder: echo prompt, in real use would call AI agent
    const response = `🤖 [Agent] Prompt received:\n${prompt}\n\n(This is a placeholder. Integrate with agent logic as needed.)`;
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
}

module.exports = CommandHandler;
