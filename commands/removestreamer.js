import { SlashCommandBuilder } from 'discord.js';
import { getAllStreamers, removeStreamer } from '../twitch/livestatus.db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('removestreamer')
        .setDescription('Entfernt einen Twitch-Streamer')
        .setDefaultMemberPermissions('0')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Twitch Username')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '🚫 Du hast dafür keine Berechtigung!', flags: 64 });
        }

        const streamer = interaction.options.getString('name').toLowerCase().trim();
        await interaction.deferReply({ flags: 64 });

        const streamers = await getAllStreamers();
        if (!streamers.includes(streamer)) {
            return interaction.editReply(`⚠️ \`${streamer}\` nicht gefunden.`);
        }

        await removeStreamer(streamer);
        await interaction.editReply(`🗑️ \`${streamer}\` wurde entfernt.`);
    }
};
