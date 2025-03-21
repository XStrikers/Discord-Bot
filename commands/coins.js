import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCoins } = from '../economy';

export default {
    data: new SlashCommandBuilder()
        .setName('coins')
        .setDescription('Zeigt deine Coins an.'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const coins = await getCoins(userId);

        if (coins !== null) {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Deine XS-Coins')
                .setDescription(`In deinem Beutel befinden sich **${coins}** <:xscoins:1346851584985792513>`)
                .setColor(0x26d926);

            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Keine Coins vorhanden')
                .setDescription('Mit dem Befehl \`/daily\` erhältst du einen <:xscoins:1346851584985792513> Beutel und sammelst deine ersten <:xscoins:1346851584985792513> ein.')
                .setColor(0xd92626);

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
