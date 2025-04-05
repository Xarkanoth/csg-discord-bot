const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const { handleRSVPButton } = require('../events/rsvp');

module.exports = async (interaction) => {
  const [prefix] = interaction.customId.split('_');

  // === RSVP Button ===
  if (prefix === 'rsvp') {
    return handleRSVPButton(interaction);
  }

  // === Step 2 Modal ===
  if (interaction.customId === 'event_step2') {
    const modal = new ModalBuilder()
      .setCustomId('event_modal_step2')
      .setTitle('📋 Create New Event — Step 2');

    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('event_rules')
        .setLabel('Rules Link (or leave blank)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),

      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('event_mods')
        .setLabel('Mod Collection Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),

      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('event_specials')
        .setLabel('Specials (emojis like 🧨 🐴 🚴)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)),

      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('event_recurring')
        .setLabel('Recurring? (weekly/monthly/none)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false))
    );

    return interaction.showModal(modal);
  }

  // === Step 3 Modal ===
  if (interaction.customId === 'event_step3') {
    const modal = new ModalBuilder()
      .setCustomId('event_modal_step3')
      .setTitle('📣 Final Step — Ping Role');

    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('event_ping')
        .setLabel('Ping Role ID (Optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false))
    );

    return interaction.showModal(modal);
  }

  return interaction.reply({
    content: '❌ Unknown button interaction.',
    flags: MessageFlags.Ephemeral
  });
};