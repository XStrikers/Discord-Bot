import { SlashCommandBuilder } from 'discord.js';
import { getStreamersFromGitHub, updateStreamersOnGitHub } from '../utils/github.js';

export default {
    data: new SlashCommandBuilder()
        .setName('removestreamer')
        .setDescription('Entfernt einen Twitch-Streamer aus der Liste')
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

        try {
            await interaction.deferReply({ flags: 64 });

            const streamerName = interaction.options.getString('name').toLowerCase().trim();

            const { streamers: originalStreamers } = await getStreamersFromGitHub();
            let streamers = Array.isArray(originalStreamers) ? originalStreamers : [];

            const found = streamers.find(s => s.toLowerCase().trim() === streamerName);
            if (!found) {
                return interaction.editReply({
                    content: `⚠️ Der Streamer \`${streamerName}\` ist nicht in der Liste.`
                });
            }

            const updatedStreamers = streamers.filter(s => s.toLowerCase().trim() !== streamerName);
            await updateStreamersOnGitHub(updatedStreamers);

            return interaction.editReply({
                content: `✅ Der Streamer \`${streamerName}\` wurde erfolgreich aus der Liste entfernt.`
            });

        } catch (error) {
            console.error('❌ Fehler bei /removestreamer:', error);

            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Es ist ein Fehler aufgetreten. Bitte versuche es erneut.'
                });
            } else {
                await interaction.reply({
                    content: '❌ Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
                    flags: 64
                });
            }
        }
    }
};
