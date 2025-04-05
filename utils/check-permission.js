const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PERMS_FILE = path.join(__dirname, '../data/command-roles.json');

module.exports = async function checkPermission(interaction, commandName) {
  try {
    // Always allow BOT_OWNER
    if (interaction.user.id === process.env.BOT_OWNER_ID) return true;

    // Load command role config
    if (!fs.existsSync(PERMS_FILE)) return false;
    const raw = fs.readFileSync(PERMS_FILE);
    const perms = JSON.parse(raw);
    const allowedRoles = perms[commandName] || [];

    // Check user roles
    const userRoles = interaction.member.roles.cache.map(role => role.id);
    const hasMatch = allowedRoles.some(roleId => userRoles.includes(roleId));
    if (!hasMatch) {
      await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[PERMISSION ERROR] ${commandName}:`, err);
    try {
      await interaction.reply({
        content: '❌ There was an error checking your permissions.',
        ephemeral: true
      });
    } catch {}
    return false;
  }
};