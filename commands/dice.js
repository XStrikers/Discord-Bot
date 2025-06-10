import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool, getCoins } from '../economy.js';
import cooldowns from '../cooldowns.js';
import { betLimits } from '../betLimits.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Würfel, um deine XS-Coins zu vermehren.')
        .addIntegerOption(option =>
            option.setName('einsatz')
                .setDescription('Setze den Betrag, den du setzen möchtest.')
                .setRequired(true)
        ),

    async execute(interaction) {

        const allowedChannelId = '1382047851512856667';

        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({
                content: 'Dieser Befehl kann nur noch im Channel <#1382047851512856667> verwendet werden.',
                flags: 64
            });
        }
        
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('einsatz');
        const cooldownTime = 10 * 60 * 1000;

        // Überprüfe, ob der Einsatz den maximalen Einsatz überschreitet
        if (bet > betLimits.dice.maxBet) {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Zu hoher Einsatz')
                .setDescription(`Der maximale Einsatz für das Dice-Spiel beträgt **${betLimits.dice.maxBet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513>. Dein Einsatz überschreitet diesen Betrag.`)
                .setColor(0xd92626);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const [rows] = await pool.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
        if (rows.length === 0 || rows[0].coins < bet) {
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> Fehlender Einsatz')
                .setDescription('Du hast nicht genug <:xscoins:1346851584985792513> für diesen Einsatz.')
                .setColor(0xd92626);
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const now = Date.now();
        if (cooldowns.dice.has(userId)) {
            const lastDiceTime = cooldowns.dice.get(userId);
            if (now - lastDiceTime < cooldownTime) {
                const remainingMinutes = Math.ceil((cooldownTime - (now - lastDiceTime)) / 1000 / 60);
                const embed = new EmbedBuilder()
                    .setTitle(':clock2: Kleine Pause')
                    .setColor(0xd98226)
                    .setDescription(`Du kannst erst in **${remainingMinutes} Minuten** erneut :game_die: würfeln.`);
                    
                    return interaction.reply({ embeds: [embed], flags: 64 });
            }
        }

        cooldowns.dice.set(userId, now);

        const userRoll1 = Math.floor(Math.random() * 6) + 1;
        const userRoll2 = Math.floor(Math.random() * 6) + 1;
        const botRoll1 = Math.floor(Math.random() * 6) + 1;
        const botRoll2 = Math.floor(Math.random() * 6) + 1;

        const userTotalRoll = userRoll1 + userRoll2;
        const botTotalRoll = botRoll1 + botRoll2;

        await interaction.deferReply();

        const initialEmbed = new EmbedBuilder()
            .setTitle(':game_die: Dice gestartet')
            .setColor('Blue')
            .setDescription(`**${interaction.user.displayName}** wettet mit **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> und :game_die: würfelt eine **${userRoll1}** und **${userRoll2}**.
            
            Warte auf den Bot, dass er würfelt.`)
            .setImage('https://xstrikers.de/discord/images/dice.png');

        let initialMessage = await interaction.editReply({ embeds: [initialEmbed] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const botRollEmbed = new EmbedBuilder()
            .setTitle(':game_die: Dice gestartet')
            .setColor('Blue')
            .setDescription(`**${interaction.user.displayName}** wettet mit **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> und :game_die: würfelt eine **${userRoll1}** und **${userRoll2}**.
            
            Der **Bot** wirft die :game_die: Würfel und hat eine **${botRoll1}** und **${botRoll2}** geworfen.`)
            .setImage('https://xstrikers.de/discord/images/dice.png');

        await interaction.editReply({ embeds: [botRollEmbed] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        let finalEmbed;
        if (userTotalRoll > botTotalRoll) {
            const reward = Math.floor(bet * 1.5);
            await pool.execute('UPDATE discord_user SET coins = coins + ? WHERE discord_id = ?', [reward, userId]);
            finalEmbed = new EmbedBuilder()
                .setTitle(':game_die: Dice gewonnen')
                .setColor(0x26d926)
                .setDescription(`**${interaction.user.displayName}** hat mit **${userTotalRoll}** gegen den **Bot** mit **${botTotalRoll}** gewonnen.
                
                **${interaction.user.displayName}** hat **${reward.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> gewonnen.`)
                .setImage('https://xstrikers.de/discord/images/win.png');
        } else if (userTotalRoll < botTotalRoll) {
            await pool.execute('UPDATE discord_user SET coins = coins - ? WHERE discord_id = ?', [bet, userId]);
            finalEmbed = new EmbedBuilder()
                .setTitle(':game_die: Dice verloren')
                .setColor(0xd92626)
                .setDescription(`**${interaction.user.displayName}** hat mit **${userTotalRoll}** gegen den **Bot** mit **${botTotalRoll}** verloren.
                
                **${interaction.user.displayName}** hat seinen Einsatz **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> verloren.`)
                .setImage('https://xstrikers.de/discord/images/lost_dice.png');
        } else {
            finalEmbed = new EmbedBuilder()
                .setTitle(':game_die: Dice unentschieden')
                .setColor(0xd98226)
                .setDescription(`**${interaction.user.displayName}** hat mit **${userTotalRoll}** gegen den **Bot** mit **${botTotalRoll}** ein Unentschieden erzielt.
                
                **${interaction.user.displayName}** erhält seine **${bet.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> zurück.`)
                .setImage('https://xstrikers.de/discord/images/lost_dice.png');
        }

        await interaction.editReply({ embeds: [finalEmbed] });
    }
};
