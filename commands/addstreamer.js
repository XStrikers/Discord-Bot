import { SlashCommandBuilder } from 'discord.js';
import { addStreamer, getAllStreamers } from '../twitch/livestatus.db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('addstreamer')
        .setDescription('Fügt einen Twitch-Streamer hinzu')
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

        const existing = await getAllStreamers();
        if (existing.includes(streamer)) {
            return interaction.editReply(`⚠️ \`${streamer}\` existiert bereits.`);
        }

        await addStreamer(streamer);
        await interaction.editReply(`✅ \`${streamer}\` wurde hinzugefügt.`);
    }
};
