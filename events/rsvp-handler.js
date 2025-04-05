// events/rsvp-handler.js
const fs = require('fs');
const path = require('path');
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