// buttons/continue-to-step2.js
const buildModal2 = require('../modals/modal-2');

module.exports = {
  customId: 'continue_to_step2',

  async execute(interaction) {
    try {
      const modal = buildModal2();
      await interaction.showModal(modal);
    } catch (err) {
      console.error('[ERROR] Failed to show step 2 modal:', err);
      await interaction.reply({ content: '❌ Failed to continue to step 2.', ephemeral: true });
    }
  }
};
