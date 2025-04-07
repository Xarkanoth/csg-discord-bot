// utils/format-event-embed.js
const { EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');

function formatEventEmbed(event) {
  const start = DateTime.fromISO(event.dateTime);
  const now = DateTime.now();

  const timeUntil = `<t:${Math.floor(start.toSeconds())}:R>`;

  const formatRsvpList = (users = []) => {
    return users.length ? users.map(id => `<@${id}>`).join('\n') : '-';
  };

  return new EmbedBuilder()
    .setTitle(`📣 ${event.title}`)
    .addFields(
      { name: '🛡 Event Info', value: `| ${event.region.toUpperCase()} |` },
      {
        name: '🕒 Time',
        value: `<t:${Math.floor(start.toSeconds())}:F>\n${timeUntil}`
      },
      {
        name: `✅ Accepted (${event.rsvps.yes.length})`,
        value: formatRsvpList(event.rsvps.yes),
        inline: true
      },
      {
        name: `❌ Declined (${event.rsvps.no.length})`,
        value: formatRsvpList(event.rsvps.no),
        inline: true
      },
      {
        name: `❓ Tentative (${event.rsvps.maybe.length})`,
        value: formatRsvpList(event.rsvps.maybe),
        inline: true
      }
    )
    .setImage(event.banner)
    .setFooter({
      text: `Created by ${event.createdBy}${event.repeatEvery?.days ? ' • Repeats weekly' : ''}`
    })
    .setColor(event.region.toLowerCase() === 'na' ? 0x660000 : 0x003dff);
}

module.exports = formatEventEmbed;