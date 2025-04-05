// modal-1.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = function buildModal1() {
  const modal = new ModalBuilder()
    .setCustomId('event_modal_step1')
    .setTitle('📝 Create New Event • Step 1');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_title')
        .setLabel('Event Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_date')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_time')
        .setLabel('Time (HH:mm 24hr)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_timezone')
        .setLabel('Timezone (e.g. UTC, EST)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_region')
        .setLabel('Region (NA or EU)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  return modal;
}