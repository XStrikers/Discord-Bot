import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLevel, getCoins } from '../economy.js';

export default {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Zeigt dein aktuelles Level und deine Coins an.'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;

        try {
            const level = await getLevel(userId);
            const coins = await getCoins(userId);

            const formattedCoins = coins !== null ? coins.toLocaleString('de-DE') : null;

            // Überprüfung ob beide Werte null sind
            if (level === null && coins === null) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Kein Profil gefunden')
                    .setDescription('Du hast noch kein Profil. Nutze `/daily`, um dein Abenteuer zu starten.')
                    .setColor(0xd92626)
                    .setImage('https://xstrikers.de/discord/images/levelup.png');

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Embed mit Level und Coins
            const embed = new EmbedBuilder()
                .setTitle('<a:tongue:1346851810173784199> Dein Fortschritt')
                .setDescription(
                    `${level !== null 
                        ? `Du bist aktuell **Level ${level}**.\nSei weiter aktiv und zeige den User, wer hier am aktivsten ist!` 
                        : '📈 Du hast noch kein Level. Nutze `/daily`, um XP zu sammeln.'
                    }\n\n` +
                    `${coins !== null 
                        ? `In deinem Beutel befinden sich aktuell **${formattedCoins}** <:xscoins:1346851584985792513>` 
                        : '💰 Noch keine Coins gefunden. Nutze `/daily`, um welche zu erhalten.'
                    }`
                )
                .setColor(0x26d926)
                .setImage('https://xstrikers.de/discord/images/levelup.png');

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Fehler beim Abrufen von Level oder Coins:', error);

            await interaction.editReply({
                content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.'
            });
        }
    },
};
