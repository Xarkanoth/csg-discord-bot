const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const checkPermission = require('../utils/check-permission');

const PERMS_FILE = path.join(__dirname, '../data/command-roles.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-roles')
    .setDescription('Assign roles that can use a specific command.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command to edit access for')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('role')
        .setDescription('Role ID to allow')
        .setRequired(true)),

  async execute(interaction) {
    const allowed = await checkPermission(interaction, 'edit-roles');
    if (!allowed) return;

    const commandName = interaction.options.getString('command');
    const roleId = interaction.options.getString('role');

    let permissions = {};
    if (fs.existsSync(PERMS_FILE)) {
      const raw = fs.readFileSync(PERMS_FILE);
      permissions = JSON.parse(raw);
    }

    permissions[commandName] = permissions[commandName] || [];

    if (!permissions[commandName].includes(roleId)) {
      permissions[commandName].push(roleId);
      fs.writeFileSync(PERMS_FILE, JSON.stringify(permissions, null, 2));
    }

    await interaction.reply({
      content: `✅ Role <@&${roleId}> is now allowed to use \`/${commandName}\`.`,
      flags: MessageFlags.Ephemeral
    });
  }
};