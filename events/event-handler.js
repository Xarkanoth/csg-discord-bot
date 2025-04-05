const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

const dataFile = path.join(__dirname, '../events/events.json');

// Utils
function resolveWeekday(input) {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = DateTime.now();

  if (input.toLowerCase() === 'today') return now;
  if (input.toLowerCase() === 'tomorrow') return now.plus({ days: 1 });

  const inputDay = weekdays.findIndex(day => day.startsWith(input.toLowerCase()));
  if (inputDay === -1) return null;

  const daysUntil = (inputDay - now.weekday + 7) % 7 || 7;
  return now.plus({ days: daysUntil });
}

function buildRSVPButtons(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rsvp_yes_${eventId}`).setLabel('✅ Going').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsvp_no_${eventId}`).setLabel('❌ Absent').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rsvp_maybe_${eventId}`).setLabel('🤔 Tentative').setStyle(ButtonStyle.Primary)
  );
}

async function postEvent(event, interaction) {
  const { title, date, time, timezone, region } = event;
  let parsedDate;

  const weekDate = resolveWeekday(date);
  parsedDate = weekDate ? weekDate : DateTime.fromFormat(date, 'yyyy-MM-dd');

  const datetime = parsedDate.setZone(timezone).set({
    hour: Number(time.split(':')[0]),
    minute: Number(time.split(':')[1])
  });

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEvent = {
    id: eventId,
    title,
    date,
    time,
    timezone,
    region,
    rsvps: { yes: [], no: [], maybe: [] },
    createdBy: interaction.user.tag,
    messageId: null,
    channelId: interaction.channel.id
  };

  // Save to events.json
  let events = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile);
      events = JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[ERROR] Failed reading ${dataFile}:`, err.message);
  }

  events.push(newEvent);
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${title}`)
    .addFields(
      { name: '🕒 Time', value: datetime.toFormat('ff'), inline: false },
      { name: '🌍 Region', value: region || 'Not specified', inline: true },
      { name: '✅ RSVP', value: 'Nobody yet', inline: true }
    )
    .setFooter({ text: `Created by ${interaction.user.tag}` })
    .setTimestamp();

  const message = await interaction.editReply({
    content: '📢 Event Created!',
    embeds: [embed],
    components: [buildRSVPButtons(eventId)]
  });

  newEvent.messageId = message.id;
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
}

async function postEventFromScheduler(event, client, channelId) {
  const channel = await client.channels.fetch(channelId);
  if (!channel) return console.warn('Channel not found for scheduled event');

  const { title, date, time, timezone, region } = event;
  const parsedDate = DateTime.fromFormat(date, 'yyyy-MM-dd');
  const datetime = parsedDate.setZone(timezone).set({
    hour: Number(time.split(':')[0]),
    minute: Number(time.split(':')[1])
  });

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEvent = {
    id: eventId,
    title,
    date,
    time,
    timezone,
    region,
    rsvps: { yes: [], no: [], maybe: [] },
    createdBy: 'Scheduled',
    messageId: null,
    channelId
  };

  let events = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile);
      events = JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[ERROR] Failed reading ${dataFile}:`, err.message);
  }

  events.push(newEvent);
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${title}`)
    .addFields(
      { name: '🕒 Time', value: datetime.toFormat('ff'), inline: false },
      { name: '🌍 Region', value: region || 'Not specified', inline: true },
      { name: '✅ RSVP', value: 'Nobody yet', inline: true }
    )
    .setFooter({ text: `Scheduled Event` })
    .setTimestamp();

  const message = await channel.send({
    content: '📢 Scheduled Event!',
    embeds: [embed],
    components: [buildRSVPButtons(eventId)]
  });

  newEvent.messageId = message.id;
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
}

async function handleModal(interaction) {
  if (!interaction.isModalSubmit()) {
    console.warn('[handleModal] Ignored non-modal interaction');
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const fields = interaction.fields;
  const title = fields.getTextInputValue('event_title');
  const date = fields.getTextInputValue('event_date');
  const time = fields.getTextInputValue('event_time');
  const timezone = fields.getTextInputValue('event_timezone');
  const region = fields.getTextInputValue('event_region');

  await postEvent({ title, date, time, timezone, region }, interaction);
}

async function handleRSVPButton(interaction) {
  const [_, action, eventId] = interaction.customId.split('_');

  let events = [];
  try {
    const raw = fs.readFileSync(dataFile);
    events = JSON.parse(raw);
  } catch (err) {
    return interaction.reply({ content: '⚠️ Failed to load events.', ephemeral: true });
  }

  const event = events.find(e => e.id === eventId);
  if (!event) {
    return interaction.reply({ content: '⚠️ Event not found.', ephemeral: true });
  }

  // Remove user from all lists
  Object.keys(event.rsvps).forEach(key => {
    event.rsvps[key] = event.rsvps[key].filter(id => id !== interaction.user.id);
  });
  event.rsvps[action].push(interaction.user.id);

  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  await interaction.reply({ content: `✅ RSVP updated: **${action.toUpperCase()}**`, ephemeral: true });
}

module.exports = {
  handleModal,
  handleRSVPButton,
  postEventFromScheduler
};