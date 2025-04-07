const { SlashCommandBuilder } = require('discord.js');
const { startEventDMFlow } = require('../events/text-event-form');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create a new event via DMs'),

  async execute(interaction) {
    try {
      await interaction.reply({
        content: '📩 Check your DMs — I’ll walk you through creating your event!',
        ephemeral: true
      });

      await startEventDMFlow(interaction.user, interaction.channelId);
    } catch (err) {
      console.error('[ERROR] Could not start DM event flow:', err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Could not start event creation. Try again later.',
          ephemeral: true
        });
      }
    }
  }
};

// test