import { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import cooldowns from '../cooldowns.js';
import { betLimits } from '../betLimits.js';

export default {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spiele Russian Roulette mit deinem Einsatz.')
        .addIntegerOption(option =>
            option.setName('einsatz')
                .setDescription('Setze den Betrag, den du setzen möchtest.')
                .setRequired(true)
        ),

    async execute(interaction) {

        const allowedChannelId = '1382047851512856667';

        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle(':x: Game nicht vorhanden')
                    .setDescription(`Das Minigame **Roulette** befindet sich im Channel <#1382047851512856667> und kann nur noch dort gespielt werden.`)
                    .setColor(0xd92626)
                ],
                flags: 64
            });
        }

        const userId = interaction.user.id;
        const username = interaction.user.username;
        let bet = interaction.options.getInteger('einsatz');
        let round = 1;
        let chanceToLose = 0.1667;
        const cooldownTime = 10 * 60 * 1000;

        // Überprüfen, ob der Einsatz den maximalen Einsatz überschreitet
        if (bet > betLimits.roulette.maxBet) {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Zu hoher Einsatz')
                .setDescription(`Der maximale Einsatz für Roulette beträgt **${betLimits.roulette.maxBet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513>. Dein Einsatz überschreitet diesen Betrag.`)
                .setColor(0xd92626);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (cooldowns.roulette.has(userId)) {
            const lastGameTime = cooldowns.roulette.get(userId);
            const now = Date.now();
            if (now - lastGameTime < cooldownTime) {
                const remainingMinutes = Math.ceil((cooldownTime - (now - lastGameTime)) / 1000 / 60);
                const embed = new EmbedBuilder()
                    .setTitle(':clock2: Kleine Pause')
                    .setColor(0xd98226)
                    .setDescription(`Du kannst erst in **${remainingMinutes} Minuten** erneut mit der 🔫 Wasserpistole spielen.`);
                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        }

        cooldowns.roulette.set(userId, Date.now());
        
        const [rows] = await pool.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
        if (rows.length === 0 || rows[0].coins < bet) {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Fehlender Einsatz')
                .setDescription('Du hast nicht genug <:xscoins:1346851584985792513> für diesen Einsatz.')
                .setColor(0xd92626);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }
        
        await pool.execute('UPDATE discord_user SET coins = coins - ? WHERE discord_id = ?', [bet, userId]);
        
        const nextRound = async (i) => {
            if (Math.random() < chanceToLose) {
                const embed = new EmbedBuilder()
                    .setTitle('💥 BAMM')
                    .setDescription(`**${interaction.user.displayName}** hat in Runde **${round}** und seinen Einsatz von **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> verloren.`)
                    .setColor(0xd92626)
                    .setImage('https://xstrikers.de/discord/images/r_lose.png');
                await i.update({ embeds: [embed], components: [] });
                return collector.stop('lost');
            }
            
            bet = Math.floor(bet * 1.5);
            chanceToLose += 0.10;
            round++;
            
            const embed = new EmbedBuilder()
                .setTitle(':dart: Russisches Roulette')
                .setDescription(`🔫 Runde **${round}**
                Du hast bisher **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> angesammelt.\n
                Deine Überlebenschance beträgt **${((1 - chanceToLose) * 100).toFixed(1)}%**.`)
                .setColor(0x26d926)
                .setImage('https://xstrikers.de/discord/images/russia_roulette.png');
            
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shoot').setLabel('Abzug drücken').setStyle('4'),
                new ButtonBuilder().setCustomId('cashout').setLabel('Aussteigen & Gewinn sichern').setStyle('3')
            );
            
            await i.update({ embeds: [embed], components: [buttonRow] });
        };
        
        const embed = new EmbedBuilder()
            .setTitle(':dart: Russisches Roulette')
            .setDescription(`🔫 **Runde 1** gestartet.\n
                Dein aktueller Einsatz: **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513>.`)
            .setColor(0x26d926)
            .setImage('https://xstrikers.de/discord/images/russia_roulette.png');
        
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shoot').setLabel('Abzug drücken').setStyle('3'),
            new ButtonBuilder().setCustomId('cashout').setLabel('Gewinn sichern').setStyle('4')
        );
        
        const message = await interaction.reply({ embeds: [embed], components: [buttonRow] });
        
        const collector = message.createMessageComponentCollector({ time: 30000 });
        
        collector.on('collect', async (i) => {
            if (i.user.id !== userId) {
                const embed = new EmbedBuilder()
                    .setTitle(':x: Nicht deine Runde')
                    .setDescription('Nur der ursprüngliche Spieler kann interagieren!')
                    .setColor(0xd98226);
                return i.reply({ embeds: [embed], flags: 64 });
            }
            
            if (i.customId === 'cashout') {
                await pool.execute('UPDATE discord_user SET coins = coins + ? WHERE discord_id = ?', [bet, userId]);
                const embed = new EmbedBuilder()
                    .setTitle('<:laughing:1346851741714612265> Gewinn gesichert')
                    .setDescription(`**${interaction.user.displayName}** hat sich entschieden aufzuhören und seinen Gewinn von **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> zu nehmen.`)
                    .setColor(0x26d926)
                    .setImage('https://xstrikers.de/discord/images/win.png');
                await i.update({ embeds: [embed], components: [] });
                return collector.stop('cashout');
            }
            
            if (i.customId === 'shoot') {
                await nextRound(i);
            }
        });
        
        collector.on('end', async (collected, reason) => {
            if (reason !== 'lost' && reason !== 'cashout') {
                const embed = new EmbedBuilder()
                    .setTitle('⌛ Zeit abgelaufen')
                    .setDescription(`**${interaction.user.displayName}** hat weder den Gewinn genommen noch den Abzug gedrückt und ist mit leeren Händen gegangen.`)
                    .setColor(0xd92626)
                    .setImage('https://xstrikers.de/discord/images/russia_roulette.png');
                await interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    }
};
