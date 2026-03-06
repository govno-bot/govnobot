// src/commands/public/command-imagine.js

function escapeHTML(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Handle /imagine command to generate an image
 * @param {Object} ctx - Command context
 */
async function handleImagine(ctx) {
  const { telegramApiClient: bot, fallbackChain: ai, chatId, args, message, logger } = ctx;
  const prompt = args.join(' ').trim();
  const messageId = message?.message_id;

  if (!prompt) {
    await bot.sendMessage(chatId, '🖼️ <b>Usage:</b> <code>/imagine &lt;prompt&gt;</code>\n\nExample: <code>/imagine A cyberpunk cat drinking coffee</code>', {
      parse_mode: 'HTML',
      reply_to_message_id: messageId
    });
    return;
  }

  try {
    // Send generating action (no direct chat action for "upload_photo", typing is fine, but upload_photo is better, wait let's use it)
    await bot.sendChatAction(chatId, 'upload_photo');
    
    // We can also send a temporary message to inform the user
    const processingMsg = await bot.sendMessage(chatId, '<i>🎨 Generating image...</i>', {
      parse_mode: 'HTML',
      reply_to_message_id: messageId
    });

    if (!ai || typeof ai.generateImage !== 'function') {
      throw new Error('Image generation is not supported by the current AI chain.');
    }

    const imageUrl = await ai.generateImage(prompt);

    // Delete the processing message and send the photo
    try {
      await bot.request('POST', 'deleteMessage', { chat_id: chatId, message_id: processingMsg.result.message_id });
    } catch (e) {
      logger.debug('Failed to delete processing message', { error: e.message });
    }

    await bot.sendPhoto(chatId, imageUrl, {
      caption: `🎨 <b>Prompt:</b> ${escapeHTML(prompt)}`,
      parse_mode: 'HTML',
      reply_to_message_id: messageId
    });
  } catch (error) {
    if (logger) logger.error('Imagine command failed', { error, chatId, prompt });
    await bot.sendMessage(chatId, `❌ <b>Failed to generate image:</b> ${escapeHTML(error.message || 'Unknown error')}`, {
      parse_mode: 'HTML',
      reply_to_message_id: messageId
    });
  }
}

module.exports = {
  name: 'imagine',
  handler: handleImagine
};
