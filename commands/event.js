const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const cooldowns = new Map(); // per-user cooldown
const processedInteractions = new Set(); // interaction deduplication

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create a new event through a guided form'),

  async execute(interaction) {
    console.log(`[EVENT] /event triggered by ${interaction.user.tag}`);

    // Block duplicate processing of same interaction
    if (processedInteractions.has(interaction.id)) {
      console.warn(`[SKIP] Interaction ${interaction.id} already handled.`);
      return;
    }
    processedInteractions.add(interaction.id);
    setTimeout(() => processedInteractions.delete(interaction.id), 15000); // Keep for 15s

    // Per-user debounce (prevents spam clicks)
    if (cooldowns.has(interaction.user.id)) {
      return interaction.reply({
        content: '⚠️ You already triggered the modal. Please wait a moment.',
        ephemeral: true
      });
    }
    cooldowns.set(interaction.user.id, true);
    setTimeout(() => cooldowns.delete(interaction.user.id), 3000); // 3s cooldown

    // === Build modal ===
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

    // Optionally include if you're ready for 6th field
    // const descInput = new TextInputBuilder()
    //   .setCustomId('event_description')
    //   .setLabel('Event Description')
    //   .setStyle(TextInputStyle.Paragraph)
    //   .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(timeInput),
      new ActionRowBuilder().addComponents(tzInput),
      new ActionRowBuilder().addComponents(regionInput)
      // new ActionRowBuilder().addComponents(descInput) // Enable if needed
    );

    // === Safe modal execution ===
    try {
      if (interaction.replied || interaction.deferred) {
        console.warn('❌ Interaction already acknowledged. Skipping modal.');
        return;
      }

      await interaction.showModal(modal);
    } catch (err) {
      console.error('❌ Error showing modal:', err);

      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: '❌ Failed to open the event creation modal. It may have expired or the bot restarted.',
            ephemeral: true,
          });
        } catch (replyErr) {
          console.error('⚠️ Fallback reply also failed:', replyErr);
        }
      }
    }
  }
};