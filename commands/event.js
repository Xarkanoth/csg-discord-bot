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

    const advanceInput = new TextInputBuilder()
      .setCustomId('event_post_advance')
      .setLabel('Post before? (e.g. 4h, 30m)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const repeatInput = new TextInputBuilder()
      .setCustomId('event_repeat_every')
      .setLabel('Repeat? (e.g. 1h, 0 = once)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(timeInput),
      new ActionRowBuilder().addComponents(tzInput),
      new ActionRowBuilder().addComponents(regionInput),
      new ActionRowBuilder().addComponents(advanceInput),
      new ActionRowBuilder().addComponents(repeatInput)
    );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('❌ Failed to show modal:', err);
    }
  }
};