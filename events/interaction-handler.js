const fs = require('fs');
const path = require('path');
const handleButton = require('../events/button-handler');
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

// ✅ Safe reply helper with error code awareness
async function safeReply(interaction, replyData) {
  if (interaction.replied || interaction.deferred) {
    console.warn(`[SAFE_REPLY] Already acknowledged for ${interaction.user.tag}`);
    return;
  }
  try {
    await interaction.reply(replyData);
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[SAFE_REPLY_ERROR] Interaction expired (10062) for ${interaction.user.tag}`);
    } else if (code === 40060) {
      console.warn(`[SAFE_REPLY_ERROR] Already acknowledged (40060) for ${interaction.user.tag}`);
    } else {
      console.error(`[SAFE_REPLY_ERROR] Failed to reply to ${interaction.user.tag}:`, err?.rawError || err);
    }
  }
}

module.exports = async function interactionHandler(interaction) {
  // === Slash Commands ===
  if (interaction.isCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    const requiredRoles = rolePermissions[interaction.commandName] || [];
    const memberRoles = interaction.member.roles.cache.map(role => role.id);

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
    const id = interaction.customId;
    try {
      // Modal chain buttons
      if (id === 'event_step2' || id === 'event_step3') {
        const modalId = id === 'event_step2' ? 'event_modal_step2' : 'event_modal_step3';
        const modalTitle = id === 'event_step2' ? '📋 Create New Event — Step 2' : '📋 Create New Event — Step 3';

        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        const modal = new ModalBuilder()
          .setCustomId(modalId)
          .setTitle(modalTitle);

        if (id === 'event_step2') {
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
              .setCustomId('event_rules')
              .setLabel('Rules Link')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
              .setCustomId('event_mods')
              .setLabel('Mod Collection Link')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
              .setCustomId('event_specials')
              .setLabel('Specials (Emoji Names)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
              .setCustomId('event_recurring')
              .setLabel('Recurring (weekly, monthly, none)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false))
          );
        } else {
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
              .setCustomId('event_ping')
              .setLabel('Ping Role ID')
              .setStyle(TextInputStyle.Short)
              .setRequired(true))
          );
        }

        try {
          if (interaction.replied || interaction.deferred) {
            console.warn(`[MODAL_FAIL] Interaction already replied: ${id}`);
            return;
          }
          await interaction.showModal(modal);
        } catch (err) {
          const code = err?.rawError?.code || err.code;
          if (code === 10062) {
            console.warn(`[MODAL_FAIL] Interaction expired (10062): ${id}`);
          } else if (code === 40060) {
            console.warn(`[MODAL_FAIL] Already acknowledged (40060): ${id}`);
          } else {
            console.error(`[MODAL_FAIL] Unexpected error for ${id}:`, err);
          }
        }

        return;
      }

      // All other button actions
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