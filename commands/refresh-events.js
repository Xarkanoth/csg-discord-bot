// commands/refresh-events.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const formatEventEmbed = require('../events/utils/format-event-embed');

const dataFile = path.join(__dirname, '../data/events.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refresh-events')
    .setDescription('🔄 Refresh all event messages with the latest embed layout.'),

  async execute(interaction) {
    await interaction.reply({ content: '🔄 Refreshing all event messages...', ephemeral: true });

    if (!fs.existsSync(dataFile)) return interaction.followUp({ content: '⚠️ No events.json found.', ephemeral: true });

    let events;
    try {
      events = JSON.parse(fs.readFileSync(dataFile));
    } catch (err) {
      console.error('Failed to read events.json:', err);
      return interaction.followUp({ content: '❌ Error reading event data.', ephemeral: true });
    }

    const client = interaction.client;
    let updatedCount = 0;

    for (const event of events) {
      try {
        const channel = await client.channels.fetch(event.channelId);
        if (!channel) continue;

        const message = await channel.messages.fetch(event.messageId);
        if (!message) continue;

        const embed = formatEventEmbed(event);
        await message.edit({ embeds: [embed] });
        updatedCount++;
      } catch (err) {
        console.warn(`Could not update message for event ${event.id}:`, err.message);
      }
    }

    await interaction.followUp({ content: `✅ Updated ${updatedCount} event message(s).`, ephemeral: true });
  }
};