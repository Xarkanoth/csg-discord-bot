const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel your current event creation or in-progress interaction.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let canceled = false;

    if (global.eventStepStore?.has(userId)) {
      global.eventStepStore.delete(userId);
      canceled = true;
    }

    // Add any other stores here later, like:
    // if (global.unitFormStore?.has(userId)) { ... }

    if (canceled) {
      await interaction.reply({
        content: '❌ Your in-progress form or event was canceled.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '⚠️ You have no active interactions to cancel.',
        ephemeral: true
      });
    }
  }
};