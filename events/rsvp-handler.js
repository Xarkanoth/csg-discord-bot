// events/rsvp-handler.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const dataFile = path.join(__dirname, '../data/events.json');

async function handleRSVPButton(interaction) {
  const [_, action, eventId] = interaction.customId.split('_');
  const userId = interaction.user.id;

  let events = [];
  if (fs.existsSync(dataFile)) {
    try {
      events = JSON.parse(fs.readFileSync(dataFile));
    } catch (err) {
      console.warn('[RSVP] Failed to read events file:', err);
      return interaction.reply({ content: '⚠️ Failed to process RSVP.', ephemeral: true });
    }
  }

  const event = events.find(e => e.id === eventId);
  if (!event) {
    return interaction.reply({ content: '❌ Event not found.', ephemeral: true });
  }

  // Remove from all RSVP lists
  Object.keys(event.rsvps).forEach(key => {
    event.rsvps[key] = event.rsvps[key].filter(id => id !== userId);
  });

  // Add to selected RSVP
  if (event.rsvps[action]) {
    event.rsvps[action].push(userId);
  } else {
    return interaction.reply({ content: '❌ Invalid RSVP option.', ephemeral: true });
  }

  // Attempt to update the original message embed with formatted RSVP columns
  try {
    const channel = await interaction.client.channels.fetch(event.channelId);
    const message = await channel.messages.fetch(event.messageId);

    const formatRSVPList = (ids) =>
      ids.length > 0 ? ids.map(id => `<@${id}>`).join('\n') : '-';

    const updatedEmbed = EmbedBuilder.from(message.embeds[0]);

    // Remove all fields and replace with RSVP section only
    updatedEmbed.setFields(
      {
        name: '✅ Accepted (' + event.rsvps.yes.length + ')',
        value: formatRSVPList(event.rsvps.yes),
        inline: true
      },
      {
        name: '❌ Absent (' + event.rsvps.no.length + ')',
        value: formatRSVPList(event.rsvps.no),
        inline: true
      },
      {
        name: '🤔 Tentative (' + event.rsvps.maybe.length + ')',
        value: formatRSVPList(event.rsvps.maybe),
        inline: true
      }
    );

    await message.edit({ embeds: [updatedEmbed] });
  } catch (err) {
    console.warn('[RSVP] Could not update embed RSVP list:', err.message);
  }

  try {
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
    await interaction.reply({
      content: `✅ You RSVP'd: **${action.toUpperCase()}**`,
      ephemeral: true
    });
  } catch (err) {
    console.error('[RSVP] Failed to save RSVP:', err);
    await interaction.reply({ content: '❌ Failed to save your RSVP.', ephemeral: true });
  }
}

module.exports = { handleRSVPButton };
