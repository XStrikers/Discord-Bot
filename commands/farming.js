import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import cooldowns from '../cooldowns.js';

export default {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('Verwalte deine Farm.')
        .addSubcommand(subcommand =>
            subcommand.setName('plant')
                .setDescription('Säe Weizen für 20 Coins.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('harvest')
                .setDescription('Ernte deine Pflanzen, wenn sie bereit sind.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('Zeigt deinen Farming-Fortschritt.')
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const currentDate = new Date();

        try {
            // Checken, ob User bereits in `farming` existiert
            const [farmRows] = await pool.execute(
                'SELECT * FROM farming WHERE discord_id = ?',
                [userId]
            );

            // Wenn der Benutzer nicht existiert, erstellen wir einen Eintrag
            if (farmRows.length === 0) {
                await pool.execute(
                    'INSERT INTO farming (discord_id, level, current_xp, xp_needed) VALUES (?, 0, 0, 100)',
                    [userId]
                );
            }

            const { level, current_xp, xp_needed, plant_type, plant_time } = farmRows.length > 0 ? farmRows[0] : { level: 0, current_xp: 0, xp_needed: 100, plant_type: null, plant_time: null };

            // --------------- 🌱 Pflanze setzen ----------------
            if (interaction.options.getSubcommand() === 'plant') {
                // Überprüfen, ob der Benutzer bereits eine Pflanze geerntet hat
                if (plant_time !== null) {
                    const plantTime = new Date(plant_time);
                    const timeDiff = (currentDate - plantTime) / 60000; // Zeitdifferenz in Minuten

                    if (timeDiff >= 60) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle('🌾 Ernte bereit')
                                .setDescription('**Du hast eine reife Ernte!**\nNutze `/farm harvest`, bevor du etwas Neues pflanzt.')
                                .setColor(0xd92626)],
                            flags: 64 // Ephemeral-Flag für private Antwort
                        });
                    }

                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🌱 Dein Weizen wächst noch')
                            .setDescription(`Warte **${Math.ceil(60 - timeDiff)} Minuten**, bevor du wieder Weizen anbauen kannst.`)
                            .setColor(0xd92626)],
                        flags: 64 // Ephemeral-Flag
                    });
                }

                // Überprüfen, ob der Nutzer genug Coins hat
                const [userRows] = await pool.execute(
                    'SELECT coins FROM discord_user WHERE discord_id = ?',
                    [userId]
                );
                const userCoins = userRows.length > 0 ? userRows[0].coins : 0;

                if (userCoins < 20) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ Nicht genug Coins')
                            .setDescription('Du benötigst mindestens **20 Coins**, um Weizen anzubauen.')
                            .setColor(0xd92626)]
                    });
                }

                // Pflanze setzen & Coins abziehen
                await pool.execute('UPDATE farming SET plant_type = ?, plant_time = ? WHERE discord_id = ?', ['Weizen', currentDate, userId]);
                await pool.execute('UPDATE discord_user SET coins = coins - 20 WHERE discord_id = ?', [userId]);

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🌱 Weizen gepflanzt')
                        .setDescription('Die Weizensamen wurden gesät. Kehre in **1 Stunde** zurück, um die Ernte einzuholen.')
                        .setColor(0x26d926)]
                });
            }

            // --------------- 🌾 Ernte einholen ----------------
            if (interaction.options.getSubcommand() === 'harvest') {
                if (plant_time === null) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ Kein Weizen gefunden')
                            .setDescription('Du hast noch nichts gepflanzt oder es ist noch nicht bereit zur Ernte.')
                            .setColor(0xd92626)],
                        flags: 64
                    });
                }

                const plantTime = new Date(plant_time);
                const timeDiff = (currentDate - plantTime) / 60000; // Zeitdifferenz in Minuten

                if (timeDiff < 60) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🌾 Noch nicht bereit')
                            .setDescription(`Dein Weizen braucht noch **${Math.ceil(60 - timeDiff)} Minuten**.`)
                            .setColor(0xd92626)],
                        flags: 64
                    });
                }

                // Ernte-Belohnung berechnen
                const reward = Math.floor(Math.random() * 51) + 50; // Coins (zwischen 50 und 100)
                const xpGain = Math.floor(Math.random() * 11) + 10; // XP (zwischen 10 und 20)

                let newXP = current_xp + xpGain;
                let newLevel = level;
                let newXPNeeded = xp_needed;

                // Prüfen, ob Level-Up
                if (newXP >= xp_needed) {
                    newLevel++;
                    newXP = 0;
                    newXPNeeded = Math.floor(xp_needed * 1.2);
                }

                // Datenbank aktualisieren
                await pool.execute('UPDATE discord_user SET coins = coins + ? WHERE discord_id = ?', [reward, userId]);
                await pool.execute('UPDATE farming SET current_xp = ?, level = ?, xp_needed = ?, plant_type = NULL, plant_time = NULL WHERE discord_id = ?', 
                    [newXP, newLevel, newXPNeeded, userId]);

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🌾 Ernte erfolgreich')
                        .setDescription(`Du hast **${reward} Coins** und **${xpGain} XP** erhalten!`)
                        .setColor(0x26d926)]
                });
            }

            // --------------- 📊 Farming-Status ----------------
            if (interaction.options.getSubcommand() === 'status') {
                let cooldownMessage = '🌱 Kein Weizen wächst gerade.';

                if (plant_time !== null) {
                    const plantTime = new Date(plant_time);
                    const timeDiff = (currentDate - plantTime) / 60000;

                    if (timeDiff < 60) {
                        cooldownMessage = `**Weizen** wächst noch. Ernte in **${Math.ceil
