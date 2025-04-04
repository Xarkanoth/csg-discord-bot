const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel any in-progress slash command flow.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let canceled = false;

    if (global.eventStepStore?.has(userId)) {
      global.eventStepStore.delete(userId);
      canceled = true;
    }

    // ⏳ Add other flows here as needed
    // e.g., if (global.editEventStore?.has(userId)) { ... }

    if (canceled) {
      await interaction.reply({
        content: '❌ Your in-progress command has been canceled.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '✅ You have no active commands to cancel.',
        ephemeral: true
      });
    }
  }
};