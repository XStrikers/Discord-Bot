import fs from 'fs';
import path from 'path';
import { SlashCommandBuilder } from 'discord.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const streamersPath = path.join(__dirname, '../twitch/streamers.json');

export default {
    data: new SlashCommandBuilder()
        .setName('liststreamers')
        .setDescription('Zeigt die Liste aller hinzugefügten Streamer'),

    async execute(interaction) {
        // Zugriffsschutz: Nur der Besitzer darf das
        const ownerId = process.env.OWNER_ID;
        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '🚫 Du darfst diesen Befehl nicht verwenden.',
                ephemeral: true
            });
        }

        let streamers = [];
        try {
            const fileContent = fs.readFileSync(streamersPath, 'utf-8');
            streamers = JSON.parse(fileContent);
        } catch (err) {
            return interaction.reply({
                content: '⚠️ Es gibt derzeit keine Streamer in der Liste.',
                ephemeral: true
            });
        }

        if (streamers.length === 0) {
            return interaction.reply({
                content: '⚠️ Keine Streamer in der Liste!',
                ephemeral: true
            });
        }

        const streamersList = streamers.join('\n');
        return interaction.reply({
            content: `📝 **Aktuelle Streamer in der Liste**:\n${streamersList}`,
            ephemeral: true
        });
    }
};
