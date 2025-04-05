// events/text-event-form.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { DateTime } = require('luxon');

const dataFile = path.join(__dirname, '../data/events.json');
const parseDuration = require('../utils/parse-duration'); // optional helper

async function askQuestion(user, prompt) {
  try {
    const dm = await user.createDM();
    await dm.send(prompt);

    const collected = await dm.awaitMessages({
      max: 1,
      time: 5 * 60 * 1000,
      errors: ['time'],
      filter: m => m.author.id === user.id
    });

    return collected.first().content.trim();
  } catch (err) {
    console.error('[DM FLOW] Failed to get user response:', err);
    return null;
  }
}

async function startEventDMFlow(user, originalChannelId) {
  const answers = {};

  const questions = [
    { key: 'title', prompt: '📌 What is the **event title**?' },
    { key: 'date', prompt: '📅 What date? Format: `YYYY-MM-DD`' },
    { key: 'time', prompt: '⏰ What time? Format: `HH:mm` (24hr)' },
    { key: 'timezone', prompt: '🌐 What timezone? (e.g. `UTC`, `America/New_York`)' },
    { key: 'region', prompt: '📍 What region? (optional)' },
    { key: 'postAdvance', prompt: '⏳ When should I post the event before it starts? (e.g. `2h`, `30m`) (optional)' },
    { key: 'repeatEvery', prompt: '🔁 How often should it repeat? (e.g. `1d`, `1w`) (optional)' }
  ];

  for (const { key, prompt } of questions) {
    const answer = await askQuestion(user, prompt);
    if (answer === null) {
      return user.send('❌ Cancelled. You didn\'t respond in time.');
    }
    answers[key] = answer;
  }

  const parsedDate = DateTime.fromFormat(`${answers.date} ${answers.time}`, 'yyyy-MM-dd HH:mm', {
    zone: answers.timezone
  });

  if (!parsedDate.isValid) {
    return user.send('❌ Invalid date or time format. Please try again.');
  }

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEvent = {
    id: eventId,
    ...answers,
    postAdvance: parseDuration(answers.postAdvance || '4h'),
    repeatEvery: parseDuration(answers.repeatEvery || ''),
    createdBy: user.tag,
    rsvps: { yes: [], no: [], maybe: [] },
    messageId: null,
    channelId: originalChannelId
  };

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${newEvent.title}`)
    .addFields(
      { name: '🕒 Time', value: parsedDate.toFormat('ff'), inline: false },
      { name: '📍 Region', value: newEvent.region || 'Not specified', inline: true },
      { name: '✅ RSVP', value: 'Nobody yet', inline: true }
    )
    .setFooter({ text: `Created by ${user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rsvp_yes_${eventId}`).setLabel('✅ Yes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsvp_no_${eventId}`).setLabel('❌ No').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rsvp_maybe_${eventId}`).setLabel('🤔 Maybe').setStyle(ButtonStyle.Primary)
  );

  const channel = await user.client.channels.fetch(originalChannelId);
  const message = await channel.send({
    content: '📣 New Event Created!',
    embeds: [embed],
    components: [row]
  });

  newEvent.messageId = message.id;

  // Save to events.json
  let events = [];
  if (fs.existsSync(dataFile)) {
    try {
      events = JSON.parse(fs.readFileSync(dataFile));
    } catch (err) {
      console.warn('[DM FLOW] Could not parse events.json:', err);
    }
  }
  events.push(newEvent);
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  await user.send('✅ Your event was created and posted to the channel!');
}

module.exports = { startEventDMFlow };
