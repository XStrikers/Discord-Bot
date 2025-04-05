import { SlashCommandBuilder } from 'discord.js';
import { getStreamersFromGitHub, updateStreamersOnGitHub } from '../utils/github.js';

export default {
    data: new SlashCommandBuilder()
        .setName('addstreamer')
        .setDescription('Fügt einen neuen Twitch-Streamer zur Liste hinzu')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Twitch-Username (ohne URL)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const streamerName = interaction.options.getString('name').toLowerCase();

        // Holen der aktuellen Streamer-Liste von GitHub
        const streamers = await getStreamersFromGitHub();

        // Prüfen, ob der Streamer bereits in der Liste ist
        if (streamers.includes(streamerName)) {
            return interaction.reply({
                content: `⚠️ Der Streamer \`${streamerName}\` ist bereits in der Liste.`,
                ephemeral: true
            });
        }

        // Füge den Streamer hinzu
        streamers.push(streamerName);

        // Speichern der aktualisierten Liste auf GitHub
        await updateStreamersOnGitHub(streamers);

        return interaction.reply({
            content: `✅ Der Streamer \`${streamerName}\` wurde erfolgreich zur Liste hinzugefügt.`,
            ephemeral: true
        });
    }
};
