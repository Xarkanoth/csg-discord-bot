const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create a new event through a guided form'),

    async execute(interaction) {
      const started = Date.now();
      console.log(`[EVENT] /event triggered by ${interaction.user.tag} at ${started}`);
    
      const modal = new ModalBuilder()
        .setCustomId('event_modal_step1')
        .setTitle('📝 Create New Event • Step 1');
    
      const titleInput = new TextInputBuilder()
        .setCustomId('event_title')
        .setLabel('Event Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const dateInput = new TextInputBuilder()
        .setCustomId('event_date')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const timeInput = new TextInputBuilder()
        .setCustomId('event_time')
        .setLabel('Time (HH:mm 24hr)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const tzInput = new TextInputBuilder()
        .setCustomId('event_timezone')
        .setLabel('Timezone (e.g. UTC, EST, Europe/London)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const regionInput = new TextInputBuilder()
        .setCustomId('event_region')
        .setLabel('Region (NA or EU)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(dateInput),
        new ActionRowBuilder().addComponents(timeInput),
        new ActionRowBuilder().addComponents(tzInput),
        new ActionRowBuilder().addComponents(regionInput)
      );
    
      try {
        const before = Date.now();
        console.log(`[MODAL] Attempting to show modal at ${before} (${before - started}ms after trigger)`);
        await interaction.showModal(modal);
        console.log(`[MODAL] Modal shown successfully at ${Date.now()}`);
      } catch (err) {
        console.error('❌ Failed to show modal:', err);
      }
    }
};
