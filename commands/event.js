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
    console.log(`[EVENT] /event triggered by ${interaction.user.tag}`);

    // ✅ Prevent multiple in-progress flows
    if (global.eventStepStore?.has(interaction.user.id)) {
      try {
        return await interaction.reply({
          content: '⚠️ You already have an event in progress. Use `/cancel` to reset.',
          ephemeral: true
        });
      } catch (e) {
        console.error(`[REPLY FAIL] Couldn't reply to ${interaction.user.tag}:`, e);
      }
      return;
    }

    try {
      const modal = new ModalBuilder()
        .setCustomId('event_modal_step1')
        .setTitle('📋 Create New Event — Step 1');

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

      await interaction.showModal(modal); // ✅ Acknowledge with showModal and return early
      return;

    } catch (err) {
      console.error('❌ Failed to show modal:', err);
      // Only reply if the modal failed and interaction hasn't been acknowledged
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: '❌ Failed to open the event modal. Try again or use `/cancel`.',
            ephemeral: true
          });
        } catch (replyErr) {
          console.error('⚠️ Fallback reply also failed:', replyErr);
        }
      }
    }
  }
};
