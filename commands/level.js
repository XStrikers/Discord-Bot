import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLevel } from '../economy.js';

export default {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Zeigt dein aktuelles Level an.'),
    
    async execute(interaction) {
        await interaction.deferReply();
    
        const userId = interaction.user.id;
        const level = await getLevel(userId);

        if (level !== null) {
            const embed = new EmbedBuilder()
                .setTitle('<a:tongue:1346851810173784199> Level Status')
                .setDescription(`Du bist aktuell **Level ${level}**.\nSpiele weiter, um aufzusteigen.`)
                .setColor(0x26d926);

            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle(':x: Kein Level gefunden')
                .setDescription('Nutze `/daily`, um <:xscoins:1346851584985792513> und XP zu sammeln und dein Abenteuer zu starten.')
                .setColor(0xd92626);

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
