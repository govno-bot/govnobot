// Marketplace command handler for GovnoBot
// Handles /marketplace publish, list, info, install
const fs = require('fs');
const path = require('path');
const MacroStore = require('../../storage/macro-store');

const MARKETPLACE_DIR = path.join(__dirname, '../../../data/marketplace');

function getMarketplaceMacros() {
  if (!fs.existsSync(MARKETPLACE_DIR)) return [];
  return fs.readdirSync(MARKETPLACE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(MARKETPLACE_DIR, f), 'utf8'));
      return { ...data, filename: f };
    });
}

const marketplaceCommand = {
  name: 'marketplace',
  /**
   * Handler for /marketplace commands
   * Usage:
   *   /marketplace publish <macroName>
   *   /marketplace list [search]
   *   /marketplace info <name>
   *   /marketplace install <name>
   */
  handler: async function(context) {
    const { chatId, userId, args, telegramApiClient } = context;
    if (!args.length) {
      await telegramApiClient.sendMessage(chatId, 'Usage:\n/marketplace publish <macroName>\n/marketplace list [search]\n/marketplace info <name>\n/marketplace install <name>');
      return;
    }
    const sub = args[0].toLowerCase();
    if (sub === 'publish') {
      if (args.length < 2) {
        await telegramApiClient.sendMessage(chatId, 'Usage: /marketplace publish <macroName>');
        return;
      }
      const macroName = args[1];
      const macros = await MacroStore.listMacros(userId, 'user');
      const found = macros.find(([name]) => name === macroName);
      if (!found) {
        await telegramApiClient.sendMessage(chatId, `Macro /${macroName} not found in your macros.`);
        return;
      }
      const [name, expansion] = found;
      const meta = {
        name,
        expansion,
        author: userId,
        published: new Date().toISOString(),
        description: args.slice(2).join(' ') || '',
      };
      const filePath = path.join(MARKETPLACE_DIR, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(meta, null, 2), 'utf8');
      await telegramApiClient.sendMessage(chatId, `✅ Macro /${name} published to marketplace.`);
    } else if (sub === 'list') {
      const search = args[1] ? args.slice(1).join(' ').toLowerCase() : '';
      const all = getMarketplaceMacros();
      const filtered = search ? all.filter(m => m.name.toLowerCase().includes(search) || m.description.toLowerCase().includes(search)) : all;
      if (!filtered.length) {
        await telegramApiClient.sendMessage(chatId, 'No marketplace macros found.');
        return;
      }
      const lines = filtered.map(m => `/${m.name} — ${m.description || '(no description)'}`);
      await telegramApiClient.sendMessage(chatId, `<b>Marketplace Macros:</b>\n${lines.join('\n')}`, { parse_mode: 'HTML' });
    } else if (sub === 'info') {
      if (args.length < 2) {
        await telegramApiClient.sendMessage(chatId, 'Usage: /marketplace info <name>');
        return;
      }
      const name = args[1];
      const all = getMarketplaceMacros();
      const found = all.find(m => m.name === name);
      if (!found) {
        await telegramApiClient.sendMessage(chatId, `Macro /${name} not found in marketplace.`);
        return;
      }
      await telegramApiClient.sendMessage(chatId, `<b>/${found.name}</b>\nAuthor: <code>${found.author}</code>\nPublished: ${found.published}\nDescription: ${found.description || '(none)'}\nExpansion: <code>${found.expansion.replace(/</g, '&lt;')}</code>`, { parse_mode: 'HTML' });
    } else if (sub === 'install') {
      if (args.length < 2) {
        await telegramApiClient.sendMessage(chatId, 'Usage: /marketplace install <name>');
        return;
      }
      const name = args[1];
      const all = getMarketplaceMacros();
      const found = all.find(m => m.name === name);
      if (!found) {
        await telegramApiClient.sendMessage(chatId, `Macro /${name} not found in marketplace.`);
        return;
      }
      await MacroStore.addMacro(userId, found.name, found.expansion, 'user');
      await telegramApiClient.sendMessage(chatId, `✅ Macro /${found.name} installed to your macros.`);
    } else {
      await telegramApiClient.sendMessage(chatId, 'Unknown marketplace command. Use /marketplace publish|list|info|install');
    }
  }
};

module.exports = marketplaceCommand;
