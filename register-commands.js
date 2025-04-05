// register-commands.js

const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARNING] The command at ./commands/${file} is missing required "data" or "execute".`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('[REGISTER] Refreshing application (/) commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('[REGISTER] Slash commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();