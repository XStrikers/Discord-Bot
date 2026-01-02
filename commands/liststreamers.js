import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllStreamers } from '../twitch/livestatus.db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('liststreamers')
        .setDescription('Zeigt alle Streamer'),

    async execute(interaction) {
        const streamers = await getAllStreamers();

        if (!streamers.length) {
            return interaction.reply('⚠️ Keine Streamer vorhanden.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📺 Twitch Streamer')
            .setColor('#9146FF');

        streamers.forEach(s => {
            embed.addFields({
                name: `🎮 ${s}`,
                value: `[Zum Stream](https://twitch.tv/${s})`,
                inline: true
            });
        });

        return interaction.reply({ embeds: [embed] });
    }
};
