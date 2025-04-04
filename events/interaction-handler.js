const fs = require('fs');
const path = require('path');
const handleButton = require('../events/rsvp').handleRSVPButton;
const { handleModal } = require('../events/rsvp');
require('dotenv').config();

const PERMS_FILE = path.join(__dirname, '../data/command-roles.json');
const OWNER_ID = process.env.BOT_OWNER_ID;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;

// Load role permissions
let rolePermissions = {};
if (fs.existsSync(PERMS_FILE)) {
  try {
    const raw = fs.readFileSync(PERMS_FILE);
    rolePermissions = JSON.parse(raw);
  } catch (err) {
    console.error('[ERROR] Failed to read command-roles.json:', err.message);
  }
}

// ✅ Unified Safe Reply
async function safeReply(interaction, data) {
  const tag = interaction.user?.tag || 'unknown user';
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply(data);
    } else {
      await interaction.followUp({ ...data, ephemeral: true });
    }
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[SAFE_REPLY] Interaction expired (10062) for ${tag}`);
    } else if (code === 40060) {
      console.warn(`[SAFE_REPLY] Already acknowledged (40060) for ${tag}`);
    } else {
      console.error(`[SAFE_REPLY] Unexpected error for ${tag}:`, err);
    }
  }
}

module.exports = async function interactionHandler(interaction) {
  // === Slash Commands ===
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    const requiredRoles = rolePermissions[interaction.commandName] || [];
    const memberRoles = interaction.member?.roles?.cache.map(role => role.id) || [];
    const hasPermission =
      interaction.user.id === OWNER_ID ||
      memberRoles.includes(MANAGER_ROLE_ID) ||
      requiredRoles.some(role => memberRoles.includes(role));

    if (!hasPermission) {
      return safeReply(interaction, {
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[ERROR] Slash command failed:`, err);
      await safeReply(interaction, {
        content: '❌ There was an error executing that command.',
        ephemeral: true
      });
    }
    return;
  }

  // === Buttons ===
  if (interaction.isButton()) {
    try {
      await handleButton(interaction);
    } catch (err) {
      console.error(`[ERROR] Button interaction failed:`, err);
      await safeReply(interaction, {
        content: '❌ Button action failed.',
        ephemeral: true
      });
    }
    return;
  }

  // === Modals ===
  if (interaction.isModalSubmit()) {
    try {
      await handleModal(interaction);
    } catch (err) {
      console.error(`[ERROR] Modal submission failed:`, err);
      await safeReply(interaction, {
        content: '❌ Modal submission failed.',
        ephemeral: true
      });
    }
    return;
  }
};