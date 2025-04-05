const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { safeReply } = require('../utils/safe-reply.js'); // Ensure this path is correct

const dataFile = path.join(__dirname, '../events/events.json');

function buildRSVPButtons(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rsvp_yes_${eventId}`)
      .setLabel('✅ Going')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`rsvp_no_${eventId}`)
      .setLabel('❌ Absent')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`rsvp_maybe_${eventId}`)
      .setLabel('❔ Tentative')
      .setStyle(ButtonStyle.Primary)
  );
}

async function handleRSVPButton(interaction) {
  const { customId, user } = interaction;
  const [action, , eventId] = customId.split('_');

  if (!['yes', 'no', 'maybe'].includes(action)) {
    return safeReply(interaction, {
      content: '❌ Invalid RSVP action.',
      flags: MessageFlags.Ephemeral
    });
  }

  let events = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile);
      events = JSON.parse(raw);
    }
  } catch (e) {
    console.error(`[ERROR] Failed to read ${dataFile}:`, e.message);
    return safeReply(interaction, {
      content: '❌ Failed to process RSVP due to server error.',
      flags: MessageFlags.Ephemeral
    });
  }

  const event = events.find(e => e.id === eventId);
  if (!event) {
    return safeReply(interaction, {
      content: '❌ Event not found.',
      flags: MessageFlags.Ephemeral
    });
  }

  event.rsvps = event.rsvps || { yes: [], no: [], maybe: [] };

  // Remove user from all RSVP lists
  for (const key of Object.keys(event.rsvps)) {
    event.rsvps[key] = event.rsvps[key].filter(id => id !== user.id);
  }

  // Add user to the selected RSVP list
  event.rsvps[action].push(user.id);

  try {
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error(`[ERROR] Failed to write to ${dataFile}:`, e.message);
    return safeReply(interaction, {
      content: '❌ Failed to update RSVP due to server error.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Update the original event message to reflect new RSVP counts
  const eventMessage = await interaction.channel.messages.fetch(event.messageId);
  const embed = eventMessage.embeds[0];

  embed.fields = embed.fields.map(field => {
    if (field.name.startsWith('✅')) {
      field.value = event.rsvps.yes.map(id => `<@${id}>`).join('\n') || '-';
      field.name = `✅ Accepted (${event.rsvps.yes.length})`;
    } else if (field.name.startsWith('❌')) {
      field.value = event.rsvps.no.map(id => `<@${id}>`).join('\n') || '-';
      field.name = `❌ Absent (${event.rsvps.no.length})`;
    } else if (field.name.startsWith('❔')) {
      field.value = event.rsvps.maybe.map(id => `<@${id}>`).join('\n') || '-';
      field.name = `❔ Tentative (${event.rsvps.maybe.length})`;
    }
    return field;
  });

  await eventMessage.edit({ embeds: [embed], components: [buildRSVPButtons(eventId)] });

  return safeReply(interaction, {
    content: `✅ Your RSVP has been updated to **${action.toUpperCase()}**.`,
    flags: MessageFlags.Ephemeral
  });
}

module.exports = { handleRSVPButton };