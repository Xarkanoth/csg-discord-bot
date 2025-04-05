// modal-2.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = function buildModal2() {
  const modal = new ModalBuilder()
    .setCustomId('event_modal_step2')
    .setTitle('🛠️ Event Scheduling • Step 2');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_post_advance')
        .setLabel('Post before (e.g. 4h, 30m)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_repeat_every')
        .setLabel('Repeat (e.g. 1h, 0 = once)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    )
  );

  return modal;
}
