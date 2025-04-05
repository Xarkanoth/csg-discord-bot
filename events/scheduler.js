const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { DateTime, Duration } = require('luxon');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = '980145545291133068';
const EVENTS_FILE = path.join(__dirname, 'events/events.json');

client.once('ready', () => {
  console.log(`[SCHEDULER] Logged in as ${client.user.tag}`);

  cron.schedule('* * * * *', async () => {
    if (!fs.existsSync(EVENTS_FILE)) return;

    const now = DateTime.now().setZone('UTC');
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE));

    for (const event of events) {
      const eventDateTime = DateTime.fromFormat(`${event.date} ${event.time}`, 'yyyy-MM-dd HH:mm', { zone: event.timezone });
      const advance = event.postAdvance || { hours: 4 };
      const postTime = eventDateTime.minus(advance);

      // Post event if not yet posted OR it's time for a repeat
      const shouldPost = !event.scheduledPosted || (
        event.repeatEvery && event.scheduledPostedAt &&
        now.diff(DateTime.fromISO(event.scheduledPostedAt), ['hours', 'minutes']).as('minutes') >= Duration.fromObject(event.repeatEvery).as('minutes')
      );

      const timeMatches = now.toFormat('yyyy-MM-dd HH:mm') === postTime.toFormat('yyyy-MM-dd HH:mm');

      if (timeMatches && shouldPost) {
        await postEventFromScheduler(event, client, event.channelId || CHANNEL_ID);
        event.scheduledPosted = true;
        event.scheduledPostedAt = now.toISO();
        console.log(`[SCHEDULER] Posted scheduled event: ${event.title}`);
      }
    }

    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  });
});

client.login(process.env.BOT_TOKEN);