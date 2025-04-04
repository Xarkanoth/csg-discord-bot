const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const { postEvent } = require('./post-event');

if (!global.eventStepStore) global.eventStepStore = new Map();
if (!global.rsvpStore) global.rsvpStore = {};

// ✅ Safe reply helper
async function safeReply(interaction, replyData) {
  console.log(`[SAFE_REPLY] Attempting reply to ${interaction.user.tag} for ${interaction.customId || 'rsvp interaction'}`);

  if (interaction.replied || interaction.deferred) {
    console.warn(`[SAFE_REPLY] Already acknowledged for ${interaction.user.tag}`);
    return;
  }

  try {
    await interaction.reply(replyData);
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[SAFE_REPLY_ERROR] Interaction expired for ${interaction.user.tag} (10062 Unknown Interaction)`);
    } else if (code === 40060) {
      console.warn(`[SAFE_REPLY_ERROR] Already acknowledged (40060) for ${interaction.user.tag}`);
    } else {
      console.error(`[SAFE_REPLY_ERROR] Failed to reply to ${interaction.user.tag}:`, err?.rawError || err);
    }
  }
}

async function handleModal(interaction) {
  const id = interaction.customId;
  console.log(`[MODAL] Received ${id} from ${interaction.user.tag}`);

  try {
    switch (id) {
      case 'event_modal_step1': {
        const title = interaction.fields.getTextInputValue('event_title');
        const date = interaction.fields.getTextInputValue('event_date');
        const time = interaction.fields.getTextInputValue('event_time');
        const timezone = interaction.fields.getTextInputValue('event_timezone');
        const region = interaction.fields.getTextInputValue('event_region').toUpperCase();

        global.eventStepStore.set(interaction.user.id, {
          title, date, time, timezone, region
        });

        return safeReply(interaction, {
          content: '✅ Step 1 complete. Click below to continue.',
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('event_step2')
                .setLabel('Continue to Step 2')
                .setStyle(ButtonStyle.Primary)
            )
          ],
          ephemeral: true
        });
      }

      case 'event_modal_step2': {
        const rules = interaction.fields.getTextInputValue('event_rules');
        const mods = interaction.fields.getTextInputValue('event_mods');
        const specials = interaction.fields.getTextInputValue('event_specials');
        let recurring = interaction.fields.getTextInputValue('event_recurring');

        recurring = recurring?.toLowerCase().trim();
        if (recurring && !['weekly', 'monthly', 'none'].includes(recurring)) {
          return safeReply(interaction, {
            content: '❌ Invalid recurring value. Use: weekly, monthly, or none.',
            ephemeral: true
          });
        }

        if (recurring === 'none') recurring = null;

        const previous = global.eventStepStore.get(interaction.user.id);
        if (!previous) {
          return safeReply(interaction, {
            content: '❌ Missing Step 1 data.',
            ephemeral: true
          });
        }

        global.eventStepStore.set(interaction.user.id, {
          ...previous,
          rules,
          mods,
          specials,
          recurring
        });

        return safeReply(interaction, {
          content: '✅ Step 2 complete. Click below to finish.',
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('event_step3')
                .setLabel('Continue to Step 3')
                .setStyle(ButtonStyle.Success)
            )
          ],
          ephemeral: true
        });
      }

      case 'event_modal_step3': {
        const pingRoleId = interaction.fields.getTextInputValue('event_ping');
        const finalData = global.eventStepStore.get(interaction.user.id);

        if (!finalData) {
          return safeReply(interaction, {
            content: '❌ Missing previous steps.',
            ephemeral: true
          });
        }

        await postEvent({ ...finalData, pingRoleId }, interaction);
        global.eventStepStore.delete(interaction.user.id);
        return;
      }

      default:
        return safeReply(interaction, {
          content: '❌ Unknown modal interaction.',
          ephemeral: true
        });
    }

  } catch (err) {
    console.error(`[MODAL ERROR] Error handling modal '${id}' from ${interaction.user.tag}:`, err);
    await safeReply(interaction, {
      content: '❌ Something went wrong processing your submission.',
      ephemeral: true
    });
  }
}

async function handleRSVPButton(interaction) {
  const [prefix, response, eventId] = interaction.customId.split('_');
  if (prefix !== 'rsvp') return;

  if (!global.rsvpStore[eventId]) {
    global.rsvpStore[eventId] = { yes: [], no: [], maybe: [] };
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const displayName = member.nickname || member.user.username;

  for (const key of ['yes', 'no', 'maybe']) {
    global.rsvpStore[eventId][key] = global.rsvpStore[eventId][key].filter(
      entry => entry.id !== interaction.user.id
    );
  }

  global.rsvpStore[eventId][response].push({ id: interaction.user.id, name: displayName });

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const names = (list) => list.length ? list.map(e => e.name).join('\n') : '-';

  const filteredFields = embed.data.fields.filter(f =>
    !f.name.startsWith('✅') && !f.name.startsWith('❌') && !f.name.startsWith('❔')
  );

  embed.setFields([
    ...filteredFields,
    { name: `✅ Accepted (${global.rsvpStore[eventId].yes.length})`, value: names(global.rsvpStore[eventId].yes), inline: true },
    { name: `❌ Absent`, value: names(global.rsvpStore[eventId].no), inline: true },
    { name: `❔ Tentative`, value: names(global.rsvpStore[eventId].maybe), inline: true }
  ]);

  try {
    await interaction.update({ embeds: [embed] });
  } catch (err) {
    const code = err?.rawError?.code || err.code;
    if (code === 10062) {
      console.warn(`[RSVP_FAIL] Interaction expired (10062) for ${interaction.user.tag}`);
    } else if (code === 40060) {
      console.warn(`[RSVP_FAIL] Already acknowledged (40060) for ${interaction.user.tag}`);
    } else {
      console.error(`[RSVP_FAIL] Failed to update RSVP for ${interaction.user.tag}:`, err);
    }

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.followUp({
          content: '⚠️ RSVP failed. Please try again.',
          ephemeral: true
        });
      } catch (e) {
        console.error(`[RSVP_FAIL] Failed to send fallback message:`, e);
      }
    }
  }
}

module.exports = {
  handleModal,
  handleRSVPButton
};