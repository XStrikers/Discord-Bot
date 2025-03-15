const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { pool, getCoins } = require('../economy');
const cooldowns = require('../cooldowns');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Stürze dich für eine Stunde ins Abenteuer und sichere dir damit XS-Coins.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const currentDate = new Date();

        try {
            const [rows] = await pool.execute('SELECT discord_id FROM discord_user WHERE discord_id = ?', [userId]);

            if (rows.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('<:xscoins:1346851584985792513> Keinen Beutel gefunden')
                    .setDescription('Bevor du mit dem Abenteuer beginnen kannst, musst du zuerst den Befehl `/daily` ausführen, um einen Beutel zu erhalten.')
                    .setColor(0xd92626);
                return interaction.reply({ embeds: [embed] });
            }

            const [workRows] = await pool.execute('SELECT last_work, coins, current_xp, level, xp_needed FROM discord_user WHERE discord_id = ?', [userId]);
            let lastWork = workRows.length > 0 && workRows[0].last_work ? new Date(workRows[0].last_work) : null;
            let userCoins = workRows.length > 0 ? workRows[0].coins : 0;
            let currentXP = workRows[0].current_xp;
            let level = workRows[0].level;
            let xpNeeded = workRows[0].xp_needed;

            if (lastWork) {
                const timeDiff = (currentDate - lastWork) / 1000;
                if (timeDiff >= 3600) {
                    const earnedCoins = Math.floor(Math.random() * 51) + 50;
                    const earnedXP = Math.floor(Math.random() * 51) + 50;
                    const newCoins = userCoins + earnedCoins;
                    currentXP += earnedXP;

                    while (currentXP >= xpNeeded) {
                    level++;
                        let overflowXP = currentXP - xpNeeded;
                        xpNeeded = Math.floor(xpNeeded * 1.5);
                        currentXP = overflowXP;
                    }

                    await pool.execute('UPDATE discord_user SET coins = ?, current_xp = ?, level = ?, xp_needed = ?, last_work = ? WHERE discord_id = ?', [newCoins, currentXP, level, xpNeeded, currentDate, userId]);

                    const embed = new EmbedBuilder()
                        .setTitle('🧭 Neues Abenteuer gestartet!')
                        .setDescription(`Du hast dein letztes Abenteuer abgeschlossen und **${earnedCoins}** <:xscoins:1346851584985792513> sowie **${earnedXP} XP** erhalten!\nAktuell hast du in deinem XS-Coins Beutel **${newCoins}** <:xscoins:1346851584985792513> gesammelt.\n\nDu hast ein neues Abenteuer begonnen, kehre in **1 Stunde** zurück.`)
                        .setColor(0x26d926);

                    if (level > workRows[0].level) {
                        const channel = await client.channels.fetch(process.env.LEVEL_UP_CHANNEL);
                        const levelUpEmbed = new EmbedBuilder()
                            .setTitle('<:epic:1346851964389953546> Level Up')
                            .setDescription(`**${interaction.user.displayName}**, du hast das **Level ${level}** erreicht <:epic:1346851964389953546>\nMach weiter so und stürze dich ins nächste Abenteuer.`)
                            .setColor(0x26d926);
                        await channel.send({ embeds: [levelUpEmbed] });
                    }
                    return interaction.reply({ embeds: [embed] });
                } else {
                    const remainingTime = Math.ceil((3600 - timeDiff) / 60);
                    const embed = new EmbedBuilder()
                        .setTitle('🧭 Aktives Abenteuer')
                        .setDescription(`Du bist noch auf einem Abenteuer! \nIn **${remainingTime} Minuten** hast du dein Abenteuer beendet und kannst dann deine <:xscoins:1346851584985792513> zur Belohnung abholen.`)
                        .setColor(0xd98226);
                        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
            }

        // Neues Abenteuer starten
            await pool.execute('UPDATE discord_user SET last_work = ? WHERE discord_id = ?', [currentDate, userId]);

            const embed = new EmbedBuilder()
                .setTitle('🧭 Erstes Abenteuer gestartet')
                .setDescription(`Du hast dein erstes Abenteuer begonnen.\nKehre in **1 Stunde** zurück und nutze \`/adventure\`, um deine Belohnung zu erhalten.`)
                .setColor(0x26d926);

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setTitle(':x: Fehler')
                .setDescription(`Es gab ein Problem beim Starten deines Abenteuers.`)
                .setColor(0xd92626);

            return interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
}