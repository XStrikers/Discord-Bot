import { SlashCommandBuilder, EmbedBuilder, MessageFlags  } from 'discord.js';
import { pool, getCoins } from '../economy.js';
import cooldowns from '../cooldowns.js';

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Hole dir deine tägliche XS-Coins ab.'),


    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const currentDate = new Date();
        const today = currentDate.toISOString().split('T')[0];
    
        try {
            // Prüfe, ob der Benutzer bereits in der Datenbank ist
            const [rows] = await pool.execute('SELECT last_daily, coins, current_xp, level, xp_needed FROM discord_user WHERE discord_id = ?', [userId]);

            let lastDaily = null;
            let lastDailyDate = null;

            if (rows.length > 0 && rows[0].last_daily) {
                lastDaily = new Date(rows[0].last_daily);
                lastDailyDate = !isNaN(lastDaily.getTime()) ? lastDaily.toISOString().split('T')[0] : null;
            }
            
            let newCoins = Math.floor(Math.random() * (150 - 100 + 1)) + 100;
            let earnedXP = Math.floor(Math.random() * 51) + 50;
            
            if (rows.length === 0) {
                // Benutzer existiert nicht -> Erstelle neuen Eintrag mit zufälligen Coins und XP
                const displayName = interaction.user.displayName;

                await pool.execute(
                    'INSERT INTO discord_user (discord_id, username, display_name, coins, current_xp, xp_needed, level, last_daily, last_work) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [userId, username, displayName, newCoins, earnedXP, 120, 0, currentDate, null]
                );
                    
                const embed = new EmbedBuilder()
                    .setTitle('<:xscoins:1346851584985792513> Beutel erhalten')
                    .setDescription(`Du hast gerade einen **Beutel**, **${newCoins.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> und **${earnedXP} XP** erhalten!\nNutze \`/adventure\`, um noch mehr <:xscoins:1346851584985792513> zu sammeln.`)
                    .setColor(0x26d926)

                return interaction.reply({ embeds: [embed] });
            }
    
            // Falls der User heute schon sein Daily geholt hat
            if (lastDailyDate === today) {
                const embed = new EmbedBuilder()
                    .setTitle('<:xscoins:1346851584985792513> bereits eingesammelt')
                    .setDescription('Deine tägliche <:xscoins:1346851584985792513> hast du bereits eingesammelt.\nMorgen kannst du neue <:xscoins:1346851584985792513> einsammeln. Gebe den Befehl \`/adventure\` ein, um weitere <:xscoins:1346851584985792513> zu sammeln.')
                    .setColor(0xd92626)
                    .setImage('https://xstrikers.de/discord/images/open_chest.png')

                    return interaction.reply({ embeds: [embed] });
            }
    
            newCoins = rows[0].coins + newCoins;
            const coinsEarned = newCoins - rows[0].coins;
            let currentXP = rows[0].current_xp + earnedXP;
            let level = rows[0].level;
            let xpNeeded = rows[0].xp_needed;

            // Level-Up-Logik
            while (currentXP >= xpNeeded) {
                level++;
                let overflowXP = currentXP - xpNeeded;
                xpNeeded = Math.floor(xpNeeded * 1.5);
                currentXP = overflowXP;
            }
    
            // Datenbank aktualisieren
            await pool.execute('UPDATE discord_user SET coins = ?, current_xp = ?, level = ?, xp_needed = ?, last_daily = ? WHERE discord_id = ?', [newCoins, currentXP, level, xpNeeded, currentDate, userId]);
    
            const embed = new EmbedBuilder()
                .setTitle('<:xscoins:1346851584985792513> eingesammelt')
                .setDescription(`Du hast gerade **${coinsEarned.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> und **${earnedXP} XP** eingesammelt.\nIn deinem XS-Coins Beutel befinden sich **${newCoins.toLocaleString('de-DE')}** <:xscoins:1346851584985792513>`)
                .setColor(0x26d926)
                .setImage('https://xstrikers.de/discord/images/chest.png')

            // Wenn der Benutzer ein Level-Up erreicht hat, sende eine Nachricht in den definierten Level-Up-Channel
            if (level > rows[0].level) {
                const channel = await client.channels.fetch(process.env.LEVEL_UP_CHANNEL);
                const levelUpEmbed = new EmbedBuilder()
                    .setTitle('<:epic:1346851964389953546> Level Up')
                    .setDescription(`**${interaction.user.displayName}**, du hast das **Level ${level}** erreicht <:epic:1346851964389953546>\nMach weiter so und stürze dich ins nächste Abenteuer.`)
                    .setColor(0x26d926)
                    .setImage('https://xstrikers.de/discord/images/levelup.png');

                await channel.send({ embeds: [levelUpEmbed] });
            }
                return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setTitle(':x: Fehler')
                .setDescription(`Fehler beim Abrufen der Coins. Versuche es bitte erneut.`)
                .setColor(0xd92626)

            const { MessageFlags } = import('discord.js');

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
}
