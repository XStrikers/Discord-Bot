import fs from 'fs';
import path from 'path';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
                flags: 0
            });
        }

        if (streamers.length === 0) {
            return interaction.reply({
                content: '⚠️ Keine Streamer in der Liste!',
                flags: 0
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📺 Aktuelle Streamer')
            .setColor('#9146FF')
            .setThumbnail('https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png')
            .setTimestamp();

            const fields = [];

            for (let i = 0; i < streamers.length; i++) {
                const streamer = streamers[i];
            
                fields.push({
                    name: `🎮 ${streamer}`,
                    value: `[🔗 Zum Stream](https://twitch.tv/${streamer})`,
                    inline: true
                });
            
                // Nach jedem zweiten Streamer: Leere Zeile einfügen
                const isSecondInRow = (i + 1) % 2 === 0;
                if (isSecondInRow) {
                    fields.push({
                        name: '\u200B',
                        value: '\u2003',
                        inline: false
                    });
                }
            }
            
            embed.addFields(fields);
            
            return interaction.reply({
                embeds: [embed],
                flags: 0
            });
            
    }
};
