// events/text-event-form.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { DateTime } = require('luxon');

const dataFile = path.join(__dirname, '../data/events.json');
const parseDuration = require('./utils/parse-duration');
const parseNaturalDate = require('./utils/parse-natural-date');

async function askQuestion(user, prompt, key = '', retry = 1) {
  try {
    const dm = await user.createDM();
    await dm.send(prompt);

    const collected = await dm.awaitMessages({
      max: 1,
      time: 5 * 60 * 1000,
      errors: ['time'],
      filter: m => m.author.id === user.id
    });

    const message = collected.first();

    // Handle attachment for banner field
    if (key === 'banner') {
      const hasAttachment = message.attachments && message.attachments.size > 0;
      const isValidUrl = message.content.startsWith('http');
      if (hasAttachment) {
        return message.attachments.first().url;
      } else if (isValidUrl) {
        return message.content.trim();
      } else if (retry > 0) {
        await dm.send('⚠️ Please upload or paste a **valid image URL** (ending in .png, .jpg, etc). Let\'s try again.');
        return await askQuestion(user, prompt, key, retry - 1);
      }
      return null;
    }

    const input = message.content.trim();

    if (!input && retry > 0) {
      await dm.send('⚠️ This field is required. Let\'s try again.');
      return await askQuestion(user, prompt, key, retry - 1);
    }

    return input;
  } catch (err) {
    console.error('[DM FLOW] Failed to get user response:', err);
    return null;
  }
}

async function startEventDMFlow(user, originChannelId) {
  const answers = {};

  const questions = [
    { key: 'title', prompt: '📌 What is the **event title**?' },
    { key: 'datetime', prompt: '📅 What date/time/timezone? Format something like `Monday 15:00 UTC` or `2025-04-08 19:00 America/New_York`' },
    { key: 'region', prompt: '🌍 What region? (`NA` or `EU`)' },
    { key: 'postAdvance', prompt: '📢 When should I post the event before it starts? (e.g. `2h`, `30m`) (optional)' },
    { key: 'repeatEvery', prompt: '🔁 How often should it repeat? (e.g. `1d`, `1w`) (optional)' },
    { key: 'banner', prompt: '🖼️ Please upload or paste a URL for the **banner image**:' }
  ];

  for (const { key, prompt } of questions) {
    const answer = await askQuestion(user, prompt, key);
    if (answer === null) {
      return user.send('❌ Cancelled. You didn\'t respond in time or did not provide a valid input.');
    }
    answers[key] = answer;
  }

  const parsedDate = parseNaturalDate(answers.datetime);
  if (!parsedDate || !parsedDate.isValid) {
    return user.send('❌ Invalid date/time format. Please try again using something like `Monday 15:00 UTC` or `2025-04-08 19:00 America/New_York`.');
  }

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEvent = {
    id: eventId,
    ...answers,
    dateTime: parsedDate.toISO(),
    postAdvance: parseDuration(answers.postAdvance || '4h'),
    repeatEvery: parseDuration(answers.repeatEvery || ''),
    createdBy: user.tag,
    rsvps: { yes: [], no: [], maybe: [] },
    messageId: null,
    channelId: originChannelId
  };

  const regionColor = answers.region.toLowerCase() === 'na' ? 0x660000 : 0x003dff;

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${newEvent.title}`)
    .addFields(
      { name: '✅ Accepted (0)', value: '-', inline: true },
      { name: '❌ Absent (0)', value: '-', inline: true },
      { name: '🤔 Tentative (0)', value: '-', inline: true }
    )
    .setColor(regionColor)
    .setImage(answers.banner)
    .setFooter({ text: `Created by ${user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rsvp_yes_${eventId}`).setLabel('✅ Yes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rsvp_no_${eventId}`).setLabel('❌ No').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rsvp_maybe_${eventId}`).setLabel('🤔 Maybe').setStyle(ButtonStyle.Primary)
  );

  const channel = await user.client.channels.fetch(originChannelId);
  const message = await channel.send({
    content: '📅 New Event Created!',
    embeds: [embed],
    components: [row]
  });

  newEvent.messageId = message.id;

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