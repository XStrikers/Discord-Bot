import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import cooldowns from '../cooldowns.js';

const plants = {
    "Weizen": { level: 0, cost: 20, rewardMin: 50, rewardMax: 100, xp: 10, cooldown: 30},
    "Kartoffeln": { level: 5, cost: 50, rewardMin: 80, rewardMax: 130, xp: 20, cooldown: 60},
    "Karotten": { level: 10, cost: 100, rewardMin: 130, rewardMax: 180, xp: 30, cooldown: 90},
    "Tomaten": { level: 15, cost: 150, rewardMin: 180, rewardMax: 230, xp: 40, cooldown: 120}};

export default {
    data: new SlashCommandBuilder()
        .setName('farm')
        .setDescription('Verwalte deine Farm.')
        .addSubcommand(subcommand =>
            subcommand.setName('plant')
                .setDescription('Säe eine Pflanze.')
                .addStringOption(option =>
                    option.setName('pflanze')
                        .setDescription('Wähle eine Pflanze')
                        .setRequired(true)
                        .addChoices(...Object.keys(plants).map(p => ({ name: p, value: p })))
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('harvest')
                .setDescription('Ernte deine Pflanzen.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('Zeigt deinen Farming-Fortschritt.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('market')
                .setDescription('Alle Pflanzen in einem Überblick.')
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const currentDate = new Date();
        try {
            const [farmRows] = await pool.execute('SELECT * FROM farming WHERE discord_id = ?', [userId]);
            if (farmRows.length === 0) {
                await pool.execute('INSERT INTO farming (discord_id) VALUES (?)', [userId]);
            }

            const { level, current_xp, xp_needed, plant_type, plant_time } = farmRows.length > 0 ? farmRows[0] : { level: 0, current_xp: 0, xp_needed: 100, plant_type: null, plant_time: null };

            // --------------- 🌱 Pflanzen ----------------
            if (interaction.options.getSubcommand() === 'plant') {
                const plantName = interaction.options.getString('pflanze');
                if (!plants[plantName]) return interaction.reply({ content: 'Ungültige Pflanze.', ephemeral: true });
                const plant = plants[plantName];

                if (level < plant.level) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🚫 Level zu niedrig')
                            .setDescription(`Du musst mindestens Level **${plant.level}** sein, um **${plantName}** zu pflanzen.`)
                            .setColor(0xd92626)],
                            flags: 64
                    });
                }

                if (plant_time !== null) {
                    const timeDiff = (currentDate - new Date(plant_time)) / 60000;
                    const requiredTime = plants[plant_type] ? plants[plant_type].cooldown : 60;

                    if (timeDiff < requiredTime) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle('⏳ Deine Pflanze wächst noch')
                                .setDescription(`Warte **${Math.ceil(requiredTime - timeDiff)} Minuten**, bevor du etwas Neues pflanzt.`)
                                .setColor(0xd92626)]
                        });
                    }
                }

                if (!plant_type || !plants[plant_type]) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                        .setTitle('❌ Fehler')
                        .setDescription(`Du hast noch keine Pflanze gepflanzt. Bitte pflanze zuerst etwas Neues.`)
                        .setColor(0xd92626)],
                        flags: 64
                    });
                }
              

                const [userRows] = await pool.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
                let userCoins = userRows.length > 0 ? userRows[0].coins : 0;
                if (userCoins < plant.cost) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ Nicht genug Coins')
                            .setDescription(`Du brauchst **${plant.cost} Coins**, um **${plantName}** anzubauen.`)
                            .setColor(0xd92626)],
                            flags: 64
                    });
                }

                await pool.execute('UPDATE farming SET plant_type = ?, plant_time = ? WHERE discord_id = ?', [plantName, currentDate, userId]);
                await pool.execute('UPDATE discord_user SET coins = coins - ? WHERE discord_id = ?', [plant.cost, userId]);

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle(`🌱 ${plantName} gepflanzt`)
                        .setDescription(`Deine **${plantName}** wurden gepflanzt. Kehre in **${plant.cooldown} Minuten** zurück.`)
                        .setColor(0x26d926)]
                });
            }

            // --------------- 🌾 Ernten ----------------
            if (interaction.options.getSubcommand() === 'harvest') {
                if (plant_type === null) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ Keine Pflanze zum Ernten')
                            .setDescription('Du hast nichts gepflanzt oder es ist noch nicht bereit zur Ernte.')
                            .setColor(0xd92626)],
                            flags: 64
                    });
                }

                const plant = plants[plant_type];
                const timeDiff = (currentDate - new Date(plant_time)) / 60000;

                if (timeDiff < plant.cooldown) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('⏳ Noch nicht bereit')
                            .setDescription(`Deine **${plant_type}** sind noch nicht reif. Warte **${Math.ceil(plant.cooldown - timeDiff)} Minuten**.`)
                            .setColor(0xd92626)]
                    });
                }

                const reward = Math.floor(Math.random() * (plant.rewardMax - plant.rewardMin + 1)) + plant.rewardMin;
                const xpGain = plant.xp;
                let newXP = current_xp + xpGain;
                let newLevel = level;
                let newXPNeeded = xp_needed;

                if (newXP >= xp_needed) {
                    newLevel++;
                    newXP = 0;
                    newXPNeeded = Math.floor(xp_needed * 1.2);
                }

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

            // --------------- 📊 Status ----------------
            if (interaction.options.getSubcommand() === 'status') {
                let statusMessage = '🌱 Kein Weizen wächst gerade.';

                if (plant_type !== null && plants[plant_type]) {
                    const plant = plants[plant_type];
                    const timeDiff = (currentDate - new Date(plant_time)) / 60000;
                    statusMessage = timeDiff < plant.cooldown
                        ? `**${plant_type}** wächst noch. Ernte in **${Math.ceil(plant.cooldown - timeDiff)} Minuten**.`
                        : `**${plant_type} ist bereit zur Ernte!**`;
                } else {
                    statusMessage ='🌱 Du hast momentan nichts gepflanzt.'
                }

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🌾 Dein Farming-Status')
                        .setDescription(`**Level:** ${level}\n**XP:** ${current_xp}/${xp_needed}\n\n${statusMessage}`)
                        .setColor(0x26d926)]
                });
            }

        } catch (error) {
            console.error(error);
        }
    }
};
