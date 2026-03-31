// Macro command handler for GovnoBot
const MacroStore = require('../../storage/macro-store');
const path = require('path');

const macroCommand = {
  name: 'macro',
  /**
   * Handler for /macro commands
   * Usage:
   *   /macro add <name> <expansion>
   *   /macro del <name>
   *   /macro list
   */
  handler: async function(context) {
    const { chatId, userId, args, telegramApiClient } = context;
    if (!args.length) {
      await telegramApiClient.sendMessage(chatId, 'Usage:\n/macro add <name> <expansion>\n/macro del <name>\n/macro list');
      return;
    }
    const sub = args[0].toLowerCase();
    if (sub === 'add') {
      if (args.length < 3) {
        await telegramApiClient.sendMessage(chatId, 'Usage: /macro add <name> <expansion>');
        return;
      }
      const name = args[1];
      const expansion = args.slice(2).join(' ');
      await MacroStore.addMacro(userId, name, expansion, 'user');
      await telegramApiClient.sendMessage(chatId, `✅ Macro /${name} added.`);
    } else if (sub === 'del') {
      if (args.length < 2) {
        await telegramApiClient.sendMessage(chatId, 'Usage: /macro del <name>');
        return;
      }
      const name = args[1];
      await MacroStore.deleteMacro(userId, name, 'user');
      await telegramApiClient.sendMessage(chatId, `🗑️ Macro /${name} deleted.`);
    } else if (sub === 'list') {
      const macros = await MacroStore.listMacros(userId, 'user');
      if (!macros.length) {
        await telegramApiClient.sendMessage(chatId, 'No macros defined. Use /macro add <name> <expansion> to create one.');
        return;
      }
      const lines = macros.map(([name, exp]) => `/${name} → <code>${exp.replace(/</g, '&lt;')}</code>`);
      await telegramApiClient.sendMessage(chatId, `<b>Your Macros:</b>\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    } else {
      await telegramApiClient.sendMessage(chatId, 'Unknown macro command. Use /macro add|del|list');
    }
  }
};

module.exports = macroCommand;
