const { SlashCommandBuilder } = require('discord.js');
const { MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload a specific command.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The name of the command to reload')
        .setRequired(true)
    ),

  async execute(interaction) {
    const commandName = interaction.options.getString('command', true).toLowerCase();
    const commandPath = path.join(__dirname, `${commandName}.js`);

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!fs.existsSync(commandPath)) {
        return interaction.editReply(`❌ Command \`${commandName}\` does not exist.`);
      }

      delete require.cache[require.resolve(commandPath)];
      interaction.client.commands.delete(commandName);

      const newCommand = require(commandPath);
      interaction.client.commands.set(newCommand.data.name, newCommand);

      await interaction.editReply(`✅ Command \`${commandName}\` reloaded successfully.`);
    } catch (err) {
      console.error(`❌ Failed to reload command ${commandName}:`, err);
      try {
        await interaction.editReply(`❌ Failed to reload command \`${commandName}\`: \`${err.message}\``);
      } catch (editErr) {
        console.error(`❌ Also failed to send error reply:`, editErr);
      }
    }
  }
};

// test