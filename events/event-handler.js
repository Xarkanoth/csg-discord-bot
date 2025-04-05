// event-handler.js
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const dataFile = path.join(__dirname, 'data/events.json');
const tempEventCache = require('./data/temp-event-cache');

function parseDuration(input) {
  const match = input?.match(/(\d+)([dhm])/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'd': return { days: value };
    case 'h': return { hours: value };
    case 'm': return { minutes: value };
    default: return null;
  }
}

function buildRSVPButtons(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rsvp_yes_${eventId}`).setLabel('✅ Going').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsvp_no_${eventId}`).setLabel('❌ Absent').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rsvp_maybe_${eventId}`).setLabel('🤔 Tentative').setStyle(ButtonStyle.Primary)
  );
}

async function handleModal(interaction) {
  const { customId, user, fields } = interaction;
  const userId = user.id;

  if (customId === 'event_modal_step1') {
    const title = fields.getTextInputValue('event_title');
    const date = fields.getTextInputValue('event_date');
    const time = fields.getTextInputValue('event_time');
    const timezone = fields.getTextInputValue('event_timezone');
    const region = fields.getTextInputValue('event_region');

    tempEventCache.set(userId, { title, date, time, timezone, region, channelId: interaction.channel.id });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('continue_to_step2')
        .setLabel('Continue to Step 2')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: '✅ Step 1 saved. Click below to continue:', components: [button], ephemeral: true });
  }

  else if (customId === 'event_modal_step2') {
    const step1 = tempEventCache.get(userId);
    if (!step1) {
      return await interaction.reply({ content: '⚠️ Could not find previous event data. Please start over.', ephemeral: true });
    }

    const postAdvanceStr = fields.getTextInputValue('event_post_advance') || '';
    const repeatEveryStr = fields.getTextInputValue('event_repeat_every') || '';
    const postAdvance = parseDuration(postAdvanceStr) || { hours: 4 };
    const repeatEvery = parseDuration(repeatEveryStr);

    const event = {
      ...step1,
      postAdvance,
      repeatEvery,
      rsvps: { yes: [], no: [], maybe: [] },
      createdBy: user.tag,
      messageId: null
    };

    const parsedDate = DateTime.fromFormat(`${event.date} ${event.time}`, 'yyyy-MM-dd HH:mm', { zone: event.timezone });
    const embed = new EmbedBuilder()
      .setTitle(`📅 ${event.title}`)
      .addFields(
        { name: '🕒 Time', value: parsedDate.toFormat('ff'), inline: false },
        { name: '🌍 Region', value: event.region || 'Not specified', inline: true },
        { name: '✅ RSVP', value: 'Nobody yet', inline: true }
      )
      .setFooter({ text: `Created by ${user.tag}` })
      .setTimestamp();

    const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    event.id = eventId;

    let events = [];
    if (fs.existsSync(dataFile)) {
      events = JSON.parse(fs.readFileSync(dataFile));
    }

    const reply = await interaction.reply({
      content: '📢 Event Created!',
      embeds: [embed],
      components: [buildRSVPButtons(eventId)],
      ephemeral: false
    });

    event.messageId = reply.id;
    events.push(event);
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
    tempEventCache.clear(userId);
  }
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

  // Remove user from all RSVP lists
  Object.keys(event.rsvps).forEach(key => {
    event.rsvps[key] = event.rsvps[key].filter(id => id !== interaction.user.id);
  });

  event.rsvps[action].push(interaction.user.id);

  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  await interaction.reply({ content: `✅ RSVP updated: **${action.toUpperCase()}**`, ephemeral: true });
}

async function postEventFromScheduler(event, client, channelId) {
  const channel = await client.channels.fetch(channelId);
  if (!channel) return console.warn('Channel not found for scheduled event');

  const { title, date, time, timezone, region } = event;
  const parsedDate = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone: timezone });

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEvent = { ...event, id: eventId };

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${title}`)
    .addFields(
      { name: '🕒 Time', value: parsedDate.toFormat('ff'), inline: false },
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

  let events = [];
  if (fs.existsSync(dataFile)) {
    events = JSON.parse(fs.readFileSync(dataFile));
  }

  const idx = events.findIndex(e => e.id === event.id);
  if (idx !== -1) events[idx] = newEvent;

  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
}

module.exports = {
  handleModal,
  handleRSVPButton,
  postEventFromScheduler
};