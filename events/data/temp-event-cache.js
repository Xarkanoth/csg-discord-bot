// temp-event-cache.js
const cache = new Map();

module.exports = {
  set(userId, data) {
    cache.set(userId, { ...data, timestamp: Date.now() });
  },

  get(userId) {
    const entry = cache.get(userId);
    if (!entry) return null;

    // Expire after 10 minutes
    const age = Date.now() - entry.timestamp;
    if (age > 10 * 60 * 1000) {
      cache.delete(userId);
      return null;
    }

    return entry;
  },

  clear(userId) {
    cache.delete(userId);
  }
};
