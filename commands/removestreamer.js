import { SlashCommandBuilder } from 'discord.js';
import { getStreamersFromGitHub, updateStreamersOnGitHub } from '../utils/github.js';

export default {
    data: new SlashCommandBuilder()
        .setName('removestreamer')
        .setDescription('Entfernt einen Twitch-Streamer aus der Liste')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Twitch-Username (ohne URL)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const streamerName = interaction.options.getString('name').toLowerCase();

        // Holen der aktuellen Streamer-Liste von GitHub
        const streamers = await getStreamersFromGitHub();

        // Prüfen, ob der Streamer in der Liste ist
        const index = streamers.indexOf(streamerName);
        if (index === -1) {
            return interaction.reply({
                content: `⚠️ Der Streamer \`${streamerName}\` ist nicht in der Liste.`,
                ephemeral: true
            });
        }

        // Entfernen des Streamers aus der Liste
        streamers.splice(index, 1);

        // Speichern der aktualisierten Liste auf GitHub
        await updateStreamersOnGitHub(streamers);

        return interaction.reply({
            content: `✅ Der Streamer \`${streamerName}\` wurde erfolgreich aus der Liste entfernt.`,
            ephemeral: true
        });
    }
};
