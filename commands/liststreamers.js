import fs from 'fs';
import path from 'path';
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const streamersPath = path.join(__dirname, '../twitch/streamers.json');

export default {
    data: new SlashCommandBuilder()
        .setName('liststreamers')
        .setDescription('Zeigt die Liste aller hinzugefügten Streamer'),

    async execute(interaction) {
        const ownerId = process.env.OWNER_ID;
        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '🚫 Du darfst diesen Befehl nicht verwenden.',
                flags: 64
            });
        }

        let streamers = [];
        try {
            const fileContent = fs.readFileSync(streamersPath, 'utf-8');
            streamers = JSON.parse(fileContent);
        } catch (err) {
            return interaction.reply({
                content: '⚠️ Es gibt derzeit keine Streamer in der Liste.',
                flags: 64
            });
        }

        if (streamers.length === 0) {
            return interaction.reply({
                content: '⚠️ Keine Streamer in der Liste!',
                flags: 64
            });
        }

        const streamerFields = streamers.map((streamer, index) => ({
            name: `🎮 Streamer #${index + 1}`,
            value: streamer,
            inline: true
        }));

        const embed = new EmbedBuilder()
            .setTitle('📝 Aktuelle Streamer-Liste')
            .setDescription('Hier sind alle derzeit hinzugefügten Streamer:')
            .addFields(streamerFields)
            .setColor('#9146FF') // Twitch Lila
            .setThumbnail('https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png')
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
