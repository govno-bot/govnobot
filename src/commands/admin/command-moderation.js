// Moderation command for admin review queue and moderation config
const { listQueue, reviewQueueItem, clearReviewed, loadConfig, saveConfig } = require('../../security/moderation');

module.exports = {
  name: 'modqueue',
  handler: async function handleModQueue(context) {
    const { chatId, args, isAdmin, client } = context;
    if (!isAdmin) {
      await client.sendMessage(chatId, '❌ This command is restricted to administrators.');
      return;
    }
    const queue = listQueue();
    if (queue.length === 0) {
      await client.sendMessage(chatId, '✅ Moderation queue is empty.');
      return;
    }
    let msg = '<b>Moderation Queue:</b>\n';
    for (const item of queue) {
      if (item.reviewed) continue;
      msg += `\nID: <code>${item.id}</code>\nUser: @${item.username} (${item.userId})\nCategory: <b>${item.category}</b>\nText: ${item.text}\n---`;
    }
    msg += '\nUse /mod approve <id> or /mod reject <id>.';
    await client.sendMessage(chatId, msg, { parse_mode: 'HTML' });
  }
};

module.exports.mod = {
  name: 'mod',
  handler: async function handleMod(context) {
    const { chatId, args, isAdmin, client } = context;
    if (!isAdmin) {
      await client.sendMessage(chatId, '❌ This command is restricted to administrators.');
      return;
    }
    if (args.length < 2) {
      await client.sendMessage(chatId, '❌ Usage: /mod approve <id> or /mod reject <id>');
      return;
    }
    const action = args[0].toLowerCase();
    const id = args[1];
    if (action !== 'approve' && action !== 'reject') {
      await client.sendMessage(chatId, '❌ Action must be approve or reject.');
      return;
    }
    const ok = reviewQueueItem(id, action);
    if (!ok) {
      await client.sendMessage(chatId, `❌ No queue item found with id: ${id}`);
      return;
    }
    await client.sendMessage(chatId, `✅ Moderation item ${id} marked as ${action}.`);
    clearReviewed();
  }
};

module.exports.modconfig = {
  name: 'modconfig',
  handler: async function handleModConfig(context) {
    const { chatId, args, isAdmin, client } = context;
    if (!isAdmin) {
      await client.sendMessage(chatId, '❌ This command is restricted to administrators.');
      return;
    }
    if (args.length === 0) {
      const cfg = loadConfig();
      await client.sendMessage(chatId, `<b>Moderation Config:</b>\n<pre>${JSON.stringify(cfg, null, 2)}</pre>`, { parse_mode: 'HTML' });
      return;
    }
    // Set config: /modconfig key value
    if (args.length < 2) {
      await client.sendMessage(chatId, '❌ Usage: /modconfig <key> <value>');
      return;
    }
    const key = args[0];
    let value = args.slice(1).join(' ');
    // Try to parse JSON for arrays/objects
    try { value = JSON.parse(value); } catch (e) {}
    const cfg = loadConfig();
    cfg[key] = value;
    saveConfig(cfg);
    await client.sendMessage(chatId, `✅ Moderation config updated: ${key} = ${JSON.stringify(value)}`);
  }
};
