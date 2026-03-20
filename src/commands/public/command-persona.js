const path = require('path');
const SettingsStore = require('../../storage/settings-store');

const PERSONAS = {
  pirate: 'You are a pirate. Speak like a pirate, use nautical terms, and be slightly gruff but helpful.',
  therapist: 'You are a compassionate, empathetic therapist. Ask probing questions, validate feelings, and provide gentle guidance.',
  yoda: 'You are Yoda from Star Wars. Speak in inverted sentences, offer cryptic but wise advice, and reference the Force.',
  robot: 'You are an emotionless, highly logical robot. Use dry, technical language, state probabilities, and be relentlessly efficient.',
  default: 'You are a helpful assistant.'
};

const personaCommand = {
  name: 'persona',
  handler: async (context) => {
    const { chatId, args, telegramApiClient, config, logger } = context;
    const settingsDir = path.join(config.dataDir, 'settings');
    let store;
    try {
      store = new SettingsStore(chatId, settingsDir);
    } catch (e) {
      if (logger) logger.error(`Error initializing SettingsStore for user ${chatId}`, e);
      await telegramApiClient.sendMessage(chatId, 'вќЊ Failed to update persona.');
      return;
    }
    
    const availablePersonas = Object.keys(PERSONAS).join(', ');

    if (args.length === 0) {
      // Escape angle brackets for Telegram HTML parse mode
      const usage = `вќЊ Usage: /persona &lt;name&gt;\n\nAvailable personas: ${availablePersonas}\n\nYou can also set a custom persona using /settings systemPrompt &lt;prompt&gt;`;
      await telegramApiClient.sendMessage(chatId, usage);
      return;
    }

    const selectedPersona = args[0].toLowerCase()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (!PERSONAS[selectedPersona]) {
      const msg = `вќЊ Unknown persona: ${selectedPersona}\n\nAvailable personas: ${availablePersonas}`;
      await telegramApiClient.sendMessage(chatId, msg);
      return;
    }

    try {
      await store.update('systemPrompt', PERSONAS[selectedPersona]);
      await telegramApiClient.sendMessage(chatId, `вњ“ Persona switched to: ${selectedPersona}`);
    } catch (err) {
      if (logger) logger.error(`Error saving persona for user ${chatId}`, err);
      await telegramApiClient.sendMessage(chatId, 'вќЊ Failed to update persona.');
    }
  }
};

module.exports = personaCommand;
