const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PERMS_FILE = path.join(__dirname, '../data/command-roles.json');
const OWNER_ID = process.env.BOT_OWNER_ID;
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editroles')
    .setDescription('Edit what roles can use a specific command.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Command name to update (no /)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('roles')
        .setDescription('Comma-separated role IDs allowed to use this command')
        .setRequired(true)),

  async execute(interaction) {
    const member = interaction.member;

    // Check if the user is the Owner
    if (interaction.user.id === OWNER_ID) {
      // Owner has full access
    } else if (member.roles.cache.has(MANAGER_ROLE_ID)) {
      // Manager Role has limited access
      // Implement any additional checks or limitations here
    } else {
      return await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const command = interaction.options.getString('command');
    const rolesInput = interaction.options.getString('roles');
    const roleIds = rolesInput.split(',').map(id => id.trim());

    let currentPerms = {};
    if (fs.existsSync(PERMS_FILE)) {
      try {
        const raw = fs.readFileSync(PERMS_FILE);
        currentPerms = JSON.parse(raw);
      } catch (err) {
        return await interaction.reply({ content: '❌ Failed to read permission file.', ephemeral: true });
      }
    }

    currentPerms[command] = roleIds;

    try {
      fs.writeFileSync(PERMS_FILE, JSON.stringify(currentPerms, null, 2));
    } catch (err) {
      return await interaction.reply({ content: '❌ Failed to update permission file.', ephemeral: true });
    }

    await interaction.reply({
      content: `✅ Updated roles for \`/${command}\` to: ${roleIds.map(id => `<@&${id}>`).join(', ')}`,
      ephemeral: false
    });
  }
};
