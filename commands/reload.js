const { SlashCommandBuilder } = require('discord.js');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reloads a command.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command to reload (filename without .js)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const allowedUserId = process.env.BOT_OWNER_ID;

    // Security check
    if (interaction.user.id !== allowedUserId) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const commandName = interaction.options.getString('command', true).toLowerCase();
    const commandsPath = path.join(__dirname);
    const filePath = path.join(commandsPath, `${commandName}.js`);

    try {
      delete require.cache[require.resolve(filePath)];

      const newCommand = require(filePath);
      if (!newCommand?.data?.name) {
        return interaction.reply({
          content: `❌ Reloaded file does not export a valid command.`,
          ephemeral: true
        });
      }

      interaction.client.commands.set(newCommand.data.name, newCommand);

      await interaction.reply({
        content: `✅ Command \`${newCommand.data.name}\` was reloaded successfully.`,
        ephemeral: true
      });

    } catch (error) {
      console.error(`❌ Failed to reload command ${commandName}:`, error);
      await interaction.reply({
        content: `❌ There was an error reloading \`${commandName}\`:\n\`${error.message}\``,
        ephemeral: true
      });
    }
  }
};