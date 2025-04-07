// ⬇️ Replace your current date parsing logic with this version
const chrono = require('chrono-node');
const { DateTime } = require('luxon');

/**
 * Parses a natural language or ISO-formatted datetime string into a Luxon DateTime.
 * @param {string} input - Input string such as "Monday 15:00 UTC"
 * @returns {DateTime|null} - Parsed Luxon DateTime or null if invalid
 */
function parseNaturalDate(input) {
  if (!input || typeof input !== 'string') return null;

  const parsedDate = chrono.parseDate(input);
  if (!parsedDate) return null;

  // Attempt to extract the timezone from the input string manually
  const zoneMatch = input.match(/\b([A-Za-z_]+\/\w+|UTC|GMT|EST|PST|CET|[A-Z]{2,})\b/);
  const zone = zoneMatch ? zoneMatch[1] : 'UTC';

  const date = DateTime.fromJSDate(parsedDate, { zone });
  return date.isValid ? date : null;
}

module.exports = parseNaturalDate;