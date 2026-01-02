import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import cooldowns from '../cooldowns.js';
import { db, getCoins, getLevel } from '../economy.js';



export default {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Stürze dich für eine Stunde ins Abenteuer und sichere dir damit XS-Coins.'),

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const currentDate = new Date();

        try {
            const [rows] = await db.execute('SELECT * FROM discord_user WHERE discord_id = ?', [userId]);

            if (rows.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('<:xscoins:1346851584985792513> Keinen Beutel gefunden')
                    .setDescription('Bevor du mit dem Abenteuer beginnen kannst, musst du zuerst den Befehl `/daily` ausführen, um einen Beutel zu erhalten.')
                    .setColor(0xd92626);
                return interaction.reply({ embeds: [embed] });
            }

            let { last_work, coins: userCoins, current_xp, level, xp_needed } = rows[0];

            let lastWork = last_work ? new Date(last_work) : null;

            const cooldown = 3600;
            
            if (lastWork) {
                const timeDiff = (currentDate - lastWork) / 1000;
                if (timeDiff >= cooldown) {
                    const earnedCoins = Math.floor(Math.random() * 51) + 50;
                    const earnedXP = Math.floor(Math.random() * 51) + 50;
                    const newCoins = userCoins + earnedCoins;
                    let currentXP = current_xp + earnedXP;

                    let newLevel = level;
                    while (currentXP >= xp_needed) {
                        newLevel++;
                        let overflowXP = currentXP - xp_needed;
                        xp_needed = Math.floor(xp_needed * 1.5);
                        currentXP = overflowXP;
                    }

                    await db.execute('UPDATE discord_user SET coins = ?, current_xp = ?, level = ?, xp_needed = ?, last_work = ? WHERE discord_id = ?', 
                        [newCoins, currentXP, newLevel, xp_needed, currentDate, userId]);

                    const embed = new EmbedBuilder()
                        .setTitle('🧭 Neues Abenteuer gestartet!')
                        .setDescription(`Du hast dein letztes Abenteuer abgeschlossen und **${earnedCoins}** <:xscoins:1346851584985792513> sowie **${earnedXP} XP** erhalten!\nAktuell hast du in deinem XS-Coins Beutel **${newCoins.toLocaleString('de-DE')}** <:xscoins:1346851584985792513> gesammelt.\n\nDu hast ein neues Abenteuer begonnen, kehre in **1 Stunde** zurück.`)
                        .setColor(0x26d926)
                        .setImage('https://xstrikers.de/discord/images/adventure.png');

                    if (newLevel > level) {
                        const channel = await client.channels.fetch(process.env.LEVEL_UP_CHANNEL);
                        const levelUpEmbed = new EmbedBuilder()
                            .setTitle('<:epic:1346851964389953546> Level Up')
                            .setDescription(`**${interaction.user.displayName}**, du hast das **Level ${newLevel}** erreicht <:epic:1346851964389953546>\nMach weiter so und stürze dich ins nächste Abenteuer.`)
                            .setColor(0x26d926)
                            .setImage('https://xstrikers.de/discord/images/levelup.png');
                        await channel.send({ embeds: [levelUpEmbed] });
                    }

                    return interaction.reply({ embeds: [embed] });
                } else {
                    const remainingTime = Math.ceil((cooldown - timeDiff) / 60);
                    const embed = new EmbedBuilder()
                        .setTitle('🧭 Aktives Abenteuer')
                        .setDescription(`Du bist noch auf einem Abenteuer! \nIn **${remainingTime} Minuten** hast du dein Abenteuer beendet und kannst dann deine <:xscoins:1346851584985792513> zur Belohnung abholen.`)
                        .setColor(0xd98226)
                        .setImage('https://xstrikers.de/discord/images/adventure.png');
                    return interaction.reply({ embeds: [embed] });
                }
            }

            await db.execute('UPDATE discord_user SET last_work = ? WHERE discord_id = ?', [currentDate, userId]);

            const embed = new EmbedBuilder()
                .setTitle('🧭 Erstes Abenteuer gestartet')
                .setDescription(`Du hast dein erstes Abenteuer begonnen.\nKehre in **1 Stunde** zurück und nutze \`/adventure\`, um deine Belohnung zu erhalten.`)
                .setColor(0x26d926)
                .setImage('https://xstrikers.de/discord/images/adventure.png');

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setTitle(':x: Fehler')
                .setDescription(`Es gab ein Problem beim Starten deines Abenteuers. Versuche es bitte erneut.`)
                .setColor(0xd92626);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
};
