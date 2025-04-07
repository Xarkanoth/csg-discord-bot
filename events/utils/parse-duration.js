// utils/parse-duration.js

/**
 * Parses a duration string like '2h', '30m', '1d', or natural phrases like '2 hours'.
 * @param {string} input
 * @returns {object|null} Duration object or null if invalid
 */
module.exports = function parseDuration(input) {
  if (!input || typeof input !== 'string') return null;

  const cleaned = input.toLowerCase().trim()
    .replace('hours', 'h')
    .replace('hour', 'h')
    .replace('minutes', 'm')
    .replace('minute', 'm')
    .replace('days', 'd')
    .replace('day', 'd')
    .replace(/\s+/g, '');

  const match = cleaned.match(/(\d+)([dhm])/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'd': return { days: value };
    case 'h': return { hours: value };
    case 'm': return { minutes: value };
    default: return null;
  }
};

