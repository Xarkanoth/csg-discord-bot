// utils/parse-natural-date.js
const { DateTime } = require('luxon');

/**
 * Parses natural language into a Luxon DateTime (e.g., "Monday" → next Monday)
 * @param {string} input - natural string like "monday" or "tomorrow"
 * @param {string} time - fallback time (e.g., "15:00")
 * @param {string} timezone - default timezone to apply
 */
module.exports = function parseNaturalDate(input, time = '12:00', timezone = 'UTC') {
  const normalized = input.trim().toLowerCase();
  const now = DateTime.now().setZone(timezone);
  let targetDate;

  if (normalized === 'today') {
    targetDate = now;
  } else if (normalized === 'tomorrow') {
    targetDate = now.plus({ days: 1 });
  } else {
    // Try to match a weekday (e.g., "monday")
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = weekdays.indexOf(normalized);

    if (targetDay >= 0) {
      let daysToAdd = (targetDay - now.weekday + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // always schedule the *next* weekday
      targetDate = now.plus({ days: daysToAdd });
    }
  }

  if (!targetDate || !targetDate.isValid) return null;

  const [hour, minute] = time.split(':').map(Number);
  return targetDate.set({ hour, minute });
};
