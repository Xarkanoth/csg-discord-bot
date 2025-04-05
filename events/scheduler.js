const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { postEventFromScheduler } = require('./event-handler');
const { DateTime } = require('luxon');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE'; // Replace with your Discord channel ID
const EVENTS_FILE = path.join(__dirname, 'events/events.json');

client.once('ready', () => {
  console.log(`[SCHEDULER] Logged in as ${client.user.tag}`);

  // Check every minute if any event should be posted
  cron.schedule('* * * * *', async () => {
    if (!fs.existsSync(EVENTS_FILE)) return;

    const now = DateTime.now().setZone('UTC');
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE));

    for (const event of events) {
      // Ensure every event includes a postAdvance field to prevent ambiguity
      const advance = event.postAdvance || { hours: 4 };

      const eventDateTime = DateTime.fromFormat(`${event.date} ${event.time}`, 'yyyy-MM-dd HH:mm', { zone: event.timezone });
      const postTime = eventDateTime.minus(advance);

      if (now.toFormat('yyyy-MM-dd HH:mm') === postTime.toFormat('yyyy-MM-dd HH:mm') && !event.scheduledPosted) {
        await postEventFromScheduler(event, client, event.channelId || CHANNEL_ID);
        event.scheduledPosted = true;
        console.log(`[SCHEDULER] Posted scheduled event: ${event.title}`);
      }
    }

    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  });
});

client.login(process.env.BOT_TOKEN);