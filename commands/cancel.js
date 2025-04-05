const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel any in-progress slash command flow.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let canceled = false;

    // ✅ Clear /event flow if active
    if (global.eventStepStore?.has(userId)) {
      global.eventStepStore.delete(userId);
      canceled = true;
    }

    // 🔧 (Add future flow resets here if needed)

    if (canceled) {
      await interaction.reply({
        content: '❌ Your in-progress command has been canceled.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '✅ You have no active commands to cancel.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};