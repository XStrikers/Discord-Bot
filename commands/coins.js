import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCoins } from '../economy.js';

export default {
    data: new SlashCommandBuilder()
        .setName('coins')
        .setDescription('Zeigt deine Coins an.'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;

        try {
            const coins = await getCoins(userId);

            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Deine XS-Coins')
                .setDescription(coins !== null 
                    ? 'In deinem Beutel befinden sich **${coins}** <:xscoins:1346851584985792513>`
                    : 'Mit dem Befehl \`/daily\` erhältst du einen <:xscoins:1346851584985792513> Beutel und sammelst deine ersten <:xscoins:1346851584985792513> ein.')
                .setColor(coins !== null ? 0x26d926 : 0xd92626);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Fehler beim Abrufen der Coins:', error);

            await interaction.editReply({ 
                content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' 
            });
        }
    },
};
