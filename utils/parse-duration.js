// utils/parse-duration.js

/**
 * Parses a duration string like '2h', '30m', '1d', etc. into milliseconds.
 * @param {string} input
 * @returns {object|null} Duration object or null if invalid
 */
module.exports = function parseDuration(input) {
    if (!input || typeof input !== 'string') return null;
  
    const match = input.match(/(\d+)([dhm])/i);
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