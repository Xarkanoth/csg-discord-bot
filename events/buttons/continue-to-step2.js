// buttons/continue-to-step2.js
const buildModal2 = require('../modals/modal-2');
const tempEventCache = require('../events/temp-event-cache');

module.exports = {
  customId: 'continue_to_step2',

  async execute(interaction) {
    try {
      const userId = interaction.user.id;

      // Make sure we still have cached data for this user
      const step1Data = tempEventCache.get(userId);
      if (!step1Data) {
        return await interaction.reply({ content: '⚠️ No previous event data found. Please start again.', ephemeral: true });
      }

      const modal = buildModal2();
      await interaction.showModal(modal);
    } catch (err) {
      console.error('[ERROR] Failed to show step 2 modal:', err);
      await interaction.reply({ content: '❌ Failed to continue to step 2.', ephemeral: true });
    }
  }
};
