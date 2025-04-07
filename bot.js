require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Message,
  MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startMonitoring } = require('./monitor');
const { runScheduler } = require('./events/scheduler');
const { handleRSVPButton } = require('./events/rsvp-handler');
const watchAllModules = require('./hot-reload');

watchAllModules([], (filename, updated) => {
  console.log(`🔁 Auto-reloaded: ${filename}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// ========== Load Commands ==========
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command?.data?.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARN] Skipping invalid command file: ${file}`);
  }
}

// ========== Global State ==========
if (!global.eventStepStore) global.eventStepStore = new Map();
global.rsvpStore = {};

// ========== Interaction Handler ==========
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      console.log(`[COMMAND] /${interaction.commandName} triggered by ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Command failed.', ephemeral: true });
      }
    }
  } else if (interaction.isButton() && interaction.customId.startsWith('rsvp_')) {
    await handleRSVPButton(interaction);
  }
});

// ========== Ready Event ==========
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const channel = client.channels.cache.get(process.env.SERVER_STATS_CHANNEL_ID);
  if (!channel) {
    console.error('❌ SERVER_STATS_CHANNEL_ID is invalid or missing.');
    return;
  }

  startMonitoring(message => {
    channel.send(message);
  });

  setInterval(() => runScheduler(client), 60 * 60 * 1000); // every hour
});

// ========== Login ==========
client.login(process.env.BOT_TOKEN);