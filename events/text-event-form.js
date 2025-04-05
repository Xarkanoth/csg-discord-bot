// events/text-event-form.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { DateTime, IANAZone } = require('luxon');

const dataFile = path.join(__dirname, '../data/events.json');
const parseDuration = require('../events/utils/parse-duration');
const parseNaturalDate = require('../events/utils/parse-natural-date');

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
    const input = message.content.trim();

    if (key === 'banner') {
      const hasAttachment = message.attachments.size > 0;
      const hasValidUrl = input.startsWith('http') && (input.endsWith('.png') || input.endsWith('.jpg') || input.endsWith('.jpeg') || input.endsWith('.gif'));

      if (hasAttachment) return message.attachments.first().url;
      if (hasValidUrl) return input;

      if (retry > 0) {
        await dm.send(`❌ Please upload a valid image or provide a direct image URL (ending in .png, .jpg, .jpeg, or .gif). Let's try again.`);
        return await askQuestion(user, prompt, key, retry - 1);
      } else {
        return null;
      }
    }

    if (key === 'timezone') {
      const zone = IANAZone.isValidZone(input);
      if (!zone && retry > 0) {
        await dm.send(`❌ That timezone is invalid. Try values like \`UTC\` or \`America/New_York\`.`);
        return await askQuestion(user, prompt, key, retry - 1);
      } else if (!zone) {
        return null;
      }
      return input;
    }

    if (key === 'region') {
      const region = input.toLowerCase();
      if (!['na', 'eu'].includes(region) && retry > 0) {
        await dm.send(`❌ Region must be \`NA\` or \`EU\`. Let's try again.`);
        return await askQuestion(user, prompt, key, retry - 1);
      } else if (!['na', 'eu'].includes(region)) {
        return null;
      }
      return input.toUpperCase();
    }

    if (key === 'date') {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(input) && retry > 0) {
        await dm.send(`📅 Try using format \`YYYY-MM-DD\` or natural like \`Monday\`, \`tomorrow\`. Let's try again.`);
        return await askQuestion(user, prompt, key, retry - 1);
      }
    }

    if (key === 'time') {
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timePattern.test(input) && retry > 0) {
        await dm.send(`⏰ Time must be in \`HH:mm\` 24hr format. Let's try again.`);
        return await askQuestion(user, prompt, key, retry - 1);
      } else if (!timePattern.test(input)) {
        return null;
      }
    }

    if (!input && retry > 0) {
      await dm.send(`⚠️ This field is required. Let's try again.`);
      return await askQuestion(user, prompt, key, retry - 1);
    } else if (!input) {
      return null;
    }

    return input;
  } catch (err) {
    console.error('[DM FLOW] Failed to get user response:', err);
    return null;
  }
}

async function startEventDMFlow(user, originalChannelId) {
  const answers = {};

  const questions = [
    { key: 'title', prompt: '📌 What is the **event title**?' },
    { key: 'date', prompt: '📅 What date? Format: `YYYY-MM-DD` or natural language like `Monday`, `tomorrow`' },
    { key: 'time', prompt: '⏰ What time? Format: `HH:mm` (24hr)' },
    { key: 'timezone', prompt: '🌐 What timezone? (e.g. `UTC`, `America/New_York`)' },
    { key: 'region', prompt: '📍 What region? (NA or EU)' },
    { key: 'postAdvance', prompt: '⏳ When should I post the event before it starts? (e.g. `2h`, `30m`) (optional)' },
    { key: 'repeatEvery', prompt: '🔁 How often should it repeat? (e.g. `1d`, `1w`) (optional)' },
    { key: 'banner', prompt: '🖼️ Please upload or paste a URL for the **banner image**:' }
  ];

  for (const { key, prompt } of questions) {
    const answer = await askQuestion(user, prompt, key);
    if (answer === null) {
      return user.send(`❌ Cancelled. You didn't respond in time or did not provide a valid input.`);
    }
    answers[key] = answer;
  }

  let parsedDate = DateTime.fromFormat(`${answers.date} ${answers.time}`, 'yyyy-MM-dd HH:mm', {
    zone: answers.timezone
  });
  if (!parsedDate.isValid) {
    parsedDate = parseNaturalDate(answers.date, answers.time, answers.timezone);
  }

  if (!parsedDate || !parsedDate.isValid) {
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

  const formatRSVPList = (ids) =>
    ids.length > 0 ? ids.map(id => `<@${id}>`).join('') : '-';

  const regionColor = answers.region.toLowerCase() === 'na' ? 0x660000 : 0x003dff;

  const embed = new EmbedBuilder()
    .setTitle(`📅 ${newEvent.title}`)
    .addFields(
      {
        name: '✅ Accepted (0)',
        value: '-',
        inline: true
      },
      {
        name: '❌ Absent (0)',
        value: '-',
        inline: true
      },
      {
        name: '🤔 Tentative (0)',
        value: '-',
        inline: true
      }
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

  const channel = await user.client.channels.fetch(originalChannelId);
  const message = await channel.send({
    content: '📣 New Event Created!',
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
