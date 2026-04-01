const path = require('path');
const CampaignStore = require('../../storage/campaign-store');

const gmCommand = {
  name: 'gm',
  handler: async (context) => {
    const { chatId, args, telegramApiClient, config, fallbackChain, logger } = context;
    const campaignDir = path.join(config.data.dir, 'campaigns');
    let store;
    try {
      store = new CampaignStore(chatId, campaignDir);
    } catch (e) {
      if (logger) logger.error(`Error init CampaignStore`, e);
      await telegramApiClient.sendMessage(chatId, '❌ Failed to access campaign data.');
      return;
    }

    if (args.length === 0) {
      await telegramApiClient.sendMessage(
        chatId,
        `🎲 <b>Game Master Mode</b>

Usage:
<code>/gm &lt;stateless scenario&gt;</code> - Improv storytelling
<code>/gm start &lt;setting&gt;</code> - Starts a stateful campaign
<code>/gm action &lt;action&gt;</code> - Perform an action in current campaign
<code>/gm stop</code> - Ends current campaign`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === 'start') {
      const setting = args.slice(1).join(' ');
      if (!setting) {
        await telegramApiClient.sendMessage(chatId, '❌ Provide a setting (e.g., <code>/gm start cyberpunk city</code>).', { parse_mode: 'HTML' });
        return;
      }
      const initialState = {
        activeCampaign: setting,
        history: [{ role: 'system', content: `You are an expert Game Master for a ${setting} setting.` }]
      };
      
      await telegramApiClient.sendChatAction(chatId, 'typing');
      
      const payload = {
        messages: initialState.history.concat({ role: 'user', content: 'Set the initial scene and tell me what I see.' })
      };
      
      try {
        const response = await fallbackChain.invoke(payload);
        initialState.history.push(
          { role: 'user', content: 'Set the initial scene and tell me what I see.' },
          { role: 'assistant', content: response.content || response }
        );
        await store.save(initialState);
        await telegramApiClient.sendMessage(chatId, `🎲 <b>Campaign Started: ${setting}</b>\n\n${response.content || response}`, { parse_mode: 'HTML' });
      } catch (e) {
        await telegramApiClient.sendMessage(chatId, '❌ AI is currently unavailable.');
      }
      return;
    }

    if (subCommand === 'stop') {
      await store.save({ activeCampaign: null, history: [] });
      await telegramApiClient.sendMessage(chatId, '🛑 Campaign stopped.');
      return;
    }

    if (subCommand === 'action') {
      const action = args.slice(1).join(' ');
      const state = await store.load();
      if (!state.activeCampaign) {
        await telegramApiClient.sendMessage(chatId, '❌ No active campaign. Use <code>/gm start &lt;setting&gt;</code>', { parse_mode: 'HTML' });
        return;
      }
      
      await telegramApiClient.sendChatAction(chatId, 'typing');
      
      state.history.push({ role: 'user', content: action });
      const payload = { messages: state.history };
      
      try {
        const response = await fallbackChain.invoke(payload);
        state.history.push({ role: 'assistant', content: response.content || response });
        await store.save(state);
        await telegramApiClient.sendMessage(chatId, `🎲 <b>Campaign: ${state.activeCampaign}</b>\n\n${response.content || response}`, { parse_mode: 'HTML' });
      } catch (e) {
        await telegramApiClient.sendMessage(chatId, '❌ AI is currently unavailable.');
      }
      return;
    }

    // Stateless scenario Mode
    const scenario = args.join(' ');
    await telegramApiClient.sendChatAction(chatId, 'typing');
    const messages = [
        { role: 'system', content: 'You are an improvisational Game Master.' },
        { role: 'user', content: `Narrate the following scenario briefly: ${scenario}` }
    ];
    try {
      const response = await fallbackChain.invoke({ messages });
      await telegramApiClient.sendMessage(chatId, `🎲 <b>Scenario:</b>\n\n${response.content || response}`, { parse_mode: 'HTML' });
    } catch (e) {
      await telegramApiClient.sendMessage(chatId, '❌ AI is currently unavailable.');
    }
  }
};

module.exports = gmCommand;