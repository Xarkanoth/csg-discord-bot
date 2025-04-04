const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

const dataFile = path.join(__dirname, '../events/events.json');

function getColorForRegion(region) {
  return region === 'NA' ? 0x660000 : 0x003dff;
}

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

// ✅ Safe reply helper
async function safeReply(interaction, replyData) {
  console.log(`[SAFE_REPLY] Attempting reply to ${interaction.user.tag} for ${interaction.customId || 'post-event reply'}`);

  if (interaction.replied || interaction.deferred) {
    console.warn(`[SAFE_REPLY] Interaction already acknowledged for ${interaction.user.tag}`);
    return;
  }

  try {
    await interaction.reply(replyData);
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[SAFE_REPLY_ERROR] Interaction expired for ${interaction.user.tag} (10062 Unknown Interaction)`);
    } else {
      console.error(`[SAFE_REPLY_ERROR] Failed to reply to ${interaction.user.tag}:`, err?.rawError || err);
    }
  }
}

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

async function postEvent(event, interaction) {
  const { title, date, time, timezone, region, rules, mods, specials } = event;

  let parsedDate;
  const weekdayDate = resolveWeekday(date);
  if (weekdayDate) {
    parsedDate = weekdayDate;
  } else {
    parsedDate = DateTime.fromFormat(date, 'yyyy-MM-dd');
  }

  const datetime = parsedDate.setZone(timezone).set({
    hour: Number(time.split(':')[0]),
    minute: Number(time.split(':')[1])
  });

  if (!datetime.isValid) {
    return safeReply(interaction, {
      content: `❌ Invalid date/time or timezone. Please ensure the format is:\n- Date: Weekday (e.g., Monday) or YYYY-MM-DD\n- Time: HH:mm (24hr)\n- Timezone: IANA zone like "UTC", "Europe/Berlin", "America/New_York"`,
      ephemeral: true
    });
  }

  const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newEvent = {
    id: eventId,
    title,
    date,
    time,
    timezone,
    region,
    rules,
    mods,
    specials,
    pingRoleIds: ['916888493005893673', '953130938320183326'],
    createdBy: interaction.user.tag,
    channelId: interaction.channel.id
  };

  let events = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf8');
      try {
        events = JSON.parse(raw);
      } catch (parseErr) {
        console.warn(`[WARN] Corrupted ${dataFile}. Resetting to empty list.`);
        events = [];
      }
    }
  } catch (e) {
    console.error(`[ERROR] Failed to read ${dataFile}:`, e.message);
  }

  events.push(newEvent);
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));

  const epoch = Math.floor(datetime.toSeconds());

  const embed = new EmbedBuilder()
    .setTitle(`📣 ${title}`)
    .addFields(
      {
        name: '\u200B',
        value: [
          `📜 **Rules** | ${rules ? `[Event Rules](${rules})` : '`[N/A]`'}`,
          `🚰 **Mods** | ${mods ? `[Mod Collection](${mods})` : '`[N/A]`'}`,
          `🎯 **Specials** | ${specials || '`[N/A]`'}`
        ].join('\n'),
        inline: false
      },
      {
        name: '🕒 Time',
        value: `<t:${epoch}:F> — <t:${epoch}:R>`,
        inline: false
      },
      { name: '\u200B', value: '**🟢 RSVP Status**', inline: false },
      { name: `✅ Accepted (0)`, value: '-', inline: true },
      { name: `❌ Absent`, value: '-', inline: true },
      { name: `❓ Tentative`, value: '-', inline: true }
    )
    .setImage('https://cdn.discordapp.com/attachments/980145545291133068/1203405567184339014/COLDSTREAM_GUARDS_PROJECT-01.png')
    .setColor(getColorForRegion(region))
    .setFooter({ text: `Created by ${interaction.user.tag} • ${region} Event • ${datetime.toFormat('yyyy-MM-dd')}` })
    .setTimestamp();

  const mention = ['<@&916888493005893673>', '<@&953130938320183326>'].join(' ');

  await safeReply(interaction, {
    content: mention,
    embeds: [embed],
    components: [buildRSVPButtons(eventId)]
  });
}

module.exports = { postEvent };