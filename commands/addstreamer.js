import { SlashCommandBuilder } from 'discord.js';
import { getStreamersFromGitHub, updateStreamersOnGitHub } from '../utils/github.js';

export default {
    data: new SlashCommandBuilder()
        .setName('addstreamer')
        .setDescription('Fügt einen neuen Twitch-Streamer zur Liste hinzu')
        .setDefaultMemberPermissions('0')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Twitch-Username (ohne URL)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const ownerId = process.env.OWNER_ID;

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '🚫 Du darfst diesen Befehl nicht verwenden.',
                flags: 64
            });
        }

        const streamerName = interaction.options.getString('name').toLowerCase();

        try {
            await interaction.deferReply({ flags: 64 });

            const { streamers } = await getStreamersFromGitHub();

            if (!Array.isArray(streamers)) {
                throw new Error("Streamer-Liste konnte nicht geladen werden.");
            }

            if (streamers.includes(streamerName)) {
                return await interaction.editReply({
                    content: `⚠️ Der Streamer \`${streamerName}\` ist bereits in der Liste.`
                });
            }

            streamers.push(streamerName);

            await updateStreamersOnGitHub(streamers);

            await interaction.editReply({
                content: `✅ Der Streamer \`${streamerName}\` wurde erfolgreich hinzugefügt!`
            });
        } catch (error) {
            console.error('❌ Fehler bei /addstreamer:', error);

            await interaction.editReply({
                content: `❌ Fehler: ${error.message || 'Unbekannter Fehler.'}`
            });
        }
    }
};
