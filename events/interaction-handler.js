const { MessageFlags } = require('discord.js');
const { handleModal, handleRSVPButton } = require('./event-handler');

module.exports = async function interactionHandler(interaction) {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('[ERROR] Slash command failed:', err);
      await safeReply(interaction, {
        content: '⚠️ There was an error executing that command.',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  if (interaction.isButton()) {
    try {
      await handleRSVPButton(interaction);
    } catch (err) {
      console.error('[ERROR] Button interaction failed:', err);
      await safeReply(interaction, {
        content: '⚠️ Button action failed.',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    try {
      await handleModal(interaction);
    } catch (err) {
      console.error('[ERROR] Modal submission failed:', err);
      await safeReply(interaction, {
        content: '⚠️ Modal submission failed.',
        flags: MessageFlags.Ephemeral
      });
    }
    return;
  }
};

async function safeReply(interaction, data) {
  const tag = interaction.user?.tag || 'unknown user';
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply(data);
    } else {
      await interaction.followUp({ ...data, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[SAFE_REPLY] Interaction expired (10062) for ${tag}`);
    } else if (code === 40060) {
      console.warn(`[SAFE_REPLY] Already acknowledged (40060) for ${tag}`);
    } else {
      console.error(`[SAFE_REPLY] Unexpected error for ${tag}:`, err);
    }
  }
}
