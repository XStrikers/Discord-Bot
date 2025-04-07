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
        try {
            await interaction.deferReply({ flags: 64 });

            const streamerName = interaction.options.getString('name').toLowerCase().trim();

            // 🧠 Wichtiger Fix: korrektes Destructuring!
            const { streamers: originalStreamers } = await getStreamersFromGitHub();
            let streamers = Array.isArray(originalStreamers) ? originalStreamers : [];

            // 🧪 Debug-Ausgabe: zeigt alle Einträge mit Längen und CharCodes
            streamers.forEach((s, i) => {
                console.log(`${i}: '${s}'`, 'Length:', s.length, 'Chars:', [...s].map(c => c.charCodeAt(0)));
            });

            console.log('📃 Aktuelle Streamer-Liste:', streamers);
            console.log('🔍 Gesuchter Name:', streamerName);

            const found = streamers.find(s => s.toLowerCase().trim() === streamerName);
            if (!found) {
                return interaction.editReply({
                    content: `⚠️ Der Streamer \`${streamerName}\` ist nicht in der Liste.`,
                    flags: 64
                });
            }

            // 🧼 Entferne den Streamer sicher aus der Liste
            const updatedStreamers = streamers.filter(s => s.toLowerCase().trim() !== streamerName);
            await updateStreamersOnGitHub(updatedStreamers);

            return interaction.editReply({
                content: `✅ Der Streamer \`${streamerName}\` wurde erfolgreich aus der Liste entfernt.`,
                flags: 64
            });

        } catch (error) {
            console.error('❌ Fehler bei Befehl:', error);
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
