const { SlashCommandBuilder } = require('discord.js');
const buildModal1 = require('../events/modals/modal-1');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create a new event through a guided form'),

  async execute(interaction) {
    console.log(`[EVENT] /event triggered by ${interaction.user.tag}`);
    const modal = buildModal1();

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('❌ Failed to show modal:', err);
    }
  }
};