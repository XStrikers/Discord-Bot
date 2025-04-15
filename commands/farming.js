import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import cooldowns from '../cooldowns.js';

const plants = {
    "🌾 Weizen": { level: 0, cost: 20, rewardMin: 50, rewardMax: 100, xp: 10, cooldown: 30 },
    "🥔 Kartoffeln": { level: 5, cost: 50, rewardMin: 80, rewardMax: 130, xp: 20, cooldown: 60 },
    "🥕 Karotten": { level: 10, cost: 100, rewardMin: 130, rewardMax: 180, xp: 30, cooldown: 90 },
    "🍅 Tomaten": { level: 15, cost: 150, rewardMin: 180, rewardMax: 230, xp: 40, cooldown: 120 }
};

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

                // Nur fortfahren, wenn du keine Pflanze hast, oder eine existierende Pflanze keine Zeit mehr benötigt
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
                        .setTitle(`${plantName} gepflanzt`)
                        .setDescription(`Deine **${plantName}**-Farm wurde gepflanzt. Kehre in **${plant.cooldown} Minuten** zurück.`)
                        .setColor(0x26d926)]
                });
            }

            // --------------- 🌾 Ernten ----------------
            if (interaction.options.getSubcommand() === 'harvest') {
                if (plant_type === null) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ Keine Farm zum Ernten')
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
                            .setDescription(`Deine **${plant_type}**-Farm ist noch nicht reif. Warte **${Math.ceil(plant.cooldown - timeDiff)} Minuten**.`)
                            .setColor(0xd92626)]
                    });
                }

                const reward = Math.floor(Math.random() * (plant.rewardMax - plant.rewardMin + 1)) + plant.rewardMin;
                const xpGain = plant.xp;
                let newXP = current_xp + xpGain;
                let newLevel = level;
                let newXPNeeded = xp_needed;

                let embeds = [new EmbedBuilder()
                    .setTitle('🌾 Ernte erfolgreich')
                    .setDescription(`Du hast **${reward} Coins** und **${xpGain} XP** erhalten!`)
                    .setColor(0x26d926)
                ];
            
                if (newXP >= xp_needed) {
                    newLevel++;
                    newXP = 0;
                    newXPNeeded = Math.floor(xp_needed * 1.2);
            
                    // Prüfen, ob eine neue Pflanze freigeschaltet wurde
                    const unlockedPlants = Object.keys(plants).filter(p => plants[p].level === newLevel);
                    if (unlockedPlants.length > 0) {
                        embeds.push(new EmbedBuilder()
                            .setTitle('🎉 Level Up!')
                            .setDescription(`Du hast **Level ${newLevel}** erreicht und folgende Pflanze freigeschaltet:\n**${unlockedPlants.join(', ')}**.`)
                            .setColor(0xf1c40f) // Goldene Farbe für Level-Up
                        );
                    } else {
                        embeds.push(new EmbedBuilder()
                            .setTitle('🎉 Level Up!')
                            .setDescription(`Du hast Level **${newLevel}** erreicht!`)
                            .setColor(0xf1c40f)
                        );
                    }
                }
            
                await pool.execute('UPDATE discord_user SET coins = coins + ? WHERE discord_id = ?', [reward, userId]);
                await pool.execute('UPDATE farming SET current_xp = ?, level = ?, xp_needed = ?, plant_type = NULL, plant_time = NULL WHERE discord_id = ?', 
                    [newXP, newLevel, newXPNeeded, userId]);
            
                return interaction.reply({ embeds });
            }

            // --------------- 📊 Status ----------------
            if (interaction.options.getSubcommand() === 'status') {
                let statusMessage = '🌱 Es wurde nichts angebaut.';

                if (plant_type !== null && plants[plant_type]) {
                    const plant = plants[plant_type];
                    const timeDiff = (currentDate - new Date(plant_time)) / 60000;
                    statusMessage = timeDiff < plant.cooldown
                        ? `**${plant_type}** wächst noch und kann erst in **${Math.ceil(plant.cooldown - timeDiff)} Minuten** geerntet werden.`
                        : `**${plant_type} ist bereit zur Ernte!**`;
                } else {
                    statusMessage ='🌱 Du hast momentan nichts gepflanzt.'
                }

                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🌾 Dein Farming-Status')
                        .setDescription(`**Du bist aktuell **Lvel ${level}**.\nAktuell hat Du auf deiner Farm **${current_xp} / ${xp_needed} XP** gesammelt.\n\n${statusMessage}`)
                        .setColor(0x26d926)]
                });
            }

        } catch (error) {
            console.error(error);
        }
    }
};
