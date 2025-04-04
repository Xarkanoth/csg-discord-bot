module.exports = async function safeReply(interaction, replyData) {
    const interactionLabel = interaction.customId || interaction.commandName || 'unknown interaction';
    console.log(`[SAFE_REPLY] Attempting reply to ${interaction.user.tag} for ${interactionLabel}`);
  
    if (interaction.replied || interaction.deferred) {
      console.warn(`[SAFE_REPLY] Interaction already acknowledged for ${interaction.user.tag}`);
      return;
    }
  
    try {
      await interaction.reply(replyData);
    } catch (err) {
      const code = err?.rawError?.code || err.code;
      if (code === 10062) {
        console.warn(`[SAFE_REPLY_ERROR] Interaction expired for ${interaction.user.tag} (10062 Unknown Interaction)`);
      } else {
        console.error(`[SAFE_REPLY_ERROR] Failed to reply to ${interaction.user.tag}:`, err?.rawError || err);
      }
    }
  };
  