const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { postEvent } = require('./post-event');

const dataFile = path.join(__dirname, '../events/events.json');

function runScheduler(client) {
  console.log('[SCHEDULER] Running recurring event check...');
  const now = DateTime.now();

  let events = [];
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile);
      events = JSON.parse(raw);
    }
  } catch (e) {
    console.error('[SCHEDULER ERROR] Could not read events.json:', e.message);
    return;
  }

  for (const event of events) {
    if (!event.recurring) continue;

    const lastDate = DateTime.fromFormat(`${event.date} ${event.time}`, 'yyyy-MM-dd HH:mm', { zone: event.timezone });
    let nextDate = null;

    if (event.recurring === 'weekly') {
      nextDate = lastDate.plus({ weeks: 1 });
    } else if (event.recurring === 'monthly') {
      nextDate = lastDate.plus({ months: 1 });
    }

    if (!nextDate || now < nextDate.startOf('hour')) continue;

    // Update date in ISO format
    const updatedEvent = {
      ...event,
      date: nextDate.toFormat('yyyy-MM-dd')
    };

    const channel = client.channels.cache.get(event.channelId);
    if (!channel) {
      console.error(`[SCHEDULER] Channel not found: ${event.channelId}`);
      continue;
    }

    postEvent(updatedEvent, { reply: (msg) => channel.send(msg) });

    event.date = nextDate.toFormat('yyyy-MM-dd'); // update source event date
  }

  // Save back to file
  try {
    fs.writeFileSync(dataFile, JSON.stringify(events, null, 2));
  } catch (e) {
    console.error('[SCHEDULER ERROR] Failed to save events.json:', e.message);
  }
}

module.exports = { runScheduler };