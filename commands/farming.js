import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import cooldowns from '../cooldowns.js';

const plants = {
    "🥕 Karotten": { level: 0, cost: 20, rewardMin: 50, rewardMax: 100, xp: 10, cooldown: 30, image: "https://xstrikers.de/discord/images/carrots.png" },
    "🥔 Kartoffeln": { level: 5, cost: 50, rewardMin: 80, rewardMax: 130, xp: 20, cooldown: 60, image: "https://xstrikers.de/discord/images/potatos.png" },
    "🍅 Tomaten": { level: 10, cost: 100, rewardMin: 130, rewardMax: 180, xp: 30, cooldown: 90, image: "https://xstrikers.de/discord/images/tomatos.png" },
    "🌾 Weizen": { level: 15, cost: 150, rewardMin: 180, rewardMax: 230, xp: 40, cooldown: 120, image: "https://xstrikers.de/discord/images/wheat.png" }
};

const slots = [
    { type: 'plant_type', time: 'plant_time' },
    { type: 'plant_type2', time: 'plant_time2' },
    { type: 'plant_type3', time: 'plant_time3' },
    { type: 'plant_type4', time: 'plant_time4' }
];

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

                let farmData;

                if (farmRows.length === 0) {
                    await pool.execute('INSERT INTO farming (discord_id) VALUES (?)', [userId]);
                    const [newFarmRows] = await pool.execute('SELECT * FROM farming WHERE discord_id = ?', [userId]);
                    farmData = newFarmRows[0];
                } else {
                    farmData = farmRows[0];
                }
        
                const { level, current_xp, xp_needed } = farmData;
        
                // --------------- 🌱 Pflanzen ----------------
                if (interaction.options.getSubcommand() === 'plant') {
                    const plantName = interaction.options.getString('pflanze');
                    const plant = plants[plantName];
        
                    if (!plant) {
                        return interaction.reply({ content: 'Ungültige Pflanze.', flags: 64 });
                    }
        
                    if (level < plant.level) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle('🚫 Level zu niedrig')
                                .setDescription(`Du musst mindestens Level **${plant.level}** sein, um **${plantName}** zu pflanzen.`)
                                .setColor(0xd92626)],
                            flags: 64
                        });
                    }
        
                    // Du hast diese Pflanze schon gepflanzt?
                    const alreadyPlanted = slots.some(slot => farmData[slot.type] === plantName);
                    if (alreadyPlanted) {
                         return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${plantName}-Farm`)
                                .setDescription(`Du hast bereits **${plantName}** angebaut. Jede Sorte darf nur einmal angepflanzt werden.`)
                                .setColor(0xd92626)
                                .setImage('https://xstrikers.de/discord/images/cultivation.png')]
                        });
                    }
        
                    // Freien Slot finden
                    const emptySlot = slots.find(slot => !farmData[slot.type]);
                    if (!emptySlot) {
                        return interaction.reply({
                            content: `Du hast bereits alle 4 Pflanzenslots belegt.`,
                            flags: 64
                        });
                    }
        
                    const [userRows] = await pool.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
                    const userCoins = userRows[0]?.coins || 0;
        
                    if (userCoins < plant.cost) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle('❌ Nicht genug Coins')
                                .setDescription(`Du brauchst **${plant.cost} Coins**, um **${plantName}** anzubauen.`)
                                .setColor(0xd92626)],
                            flags: 64
                        });
                    }
        
                    await pool.execute(`UPDATE farming SET ${emptySlot.type} = ?, ${emptySlot.time} = ? WHERE discord_id = ?`,
                        [plantName, currentDate, userId]);
                    await pool.execute('UPDATE discord_user SET coins = coins - ? WHERE discord_id = ?', [plant.cost, userId]);
        
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${plantName} gepflanzt`)
                            .setDescription(`Du hast **${plantName}** angebaut. In **${plant.cooldown} Minuten** kannst du deine Ernte einholen.`)
                            .setColor(0x26d926)
                            .setImage('https://xstrikers.de/discord/images/cultivation.png')]
                    });
                }

                // --------------- 🌾 Ernten ----------------
                if (interaction.options.getSubcommand() === 'harvest') {
                    let harvestedPlants = [];
                    let totalReward = 0;
                    let totalXP = 0;
                
                    for (const slot of slots) {
                        const plantName = farmData[slot.type];
                        const plantTime = farmData[slot.time];
                
                        if (plantName && plantTime) {
                            const plant = plants[plantName];
                            const timeDiff = (currentDate - new Date(plantTime)) / 60000;
                
                            if (timeDiff >= plant.cooldown) {
                                const reward = Math.floor(Math.random() * (plant.rewardMax - plant.rewardMin + 1)) + plant.rewardMin;
                                const xpGain = plant.xp;
                
                                totalReward += reward;
                                totalXP += xpGain;
                                harvestedPlants.push({ name: plantName, reward, xp: xpGain, image: plant.image });
                
                                // Slot zurücksetzen
                                await pool.execute(
                                    `UPDATE farming SET ${slot.type} = NULL, ${slot.time} = NULL WHERE discord_id = ?`,
                                    [userId]
                                );
                            }
                        }
                    }
                
                    if (harvestedPlants.length === 0) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder()
                                .setTitle('❌ Nichts bereit zur Ernte')
                                .setDescription('Keine deiner Pflanzen ist momentan bereit zum Ernten.')
                                .setColor(0xd92626)],
                            flags: 64
                        });
                    }
                
                    let newXP = current_xp + totalXP;
                    let newLevel = level;
                    let newXPNeeded = xp_needed;
                    let levelUpEmbeds = [];
                
                    while (newXP >= newXPNeeded) {
                        newXP -= newXPNeeded;
                        newLevel++;
                        newXPNeeded = Math.floor(newXPNeeded * 1.2);
                
                        const unlockedPlants = Object.keys(plants).filter(p => plants[p].level === newLevel);
                        levelUpEmbeds.push(new EmbedBuilder()
                            .setTitle('🎉 Level Up!')
                            .setDescription(unlockedPlants.length > 0
                                ? `Du hast **Level ${newLevel}** erreicht und neue Pflanzen freigeschaltet:\n**${unlockedPlants.join(', ')}**`
                                : `Du hast **Level ${newLevel}** erreicht!`)
                            .setColor(0xf1c40f)
                            .setImage('https://xstrikers.de/discord/images/levelup.png'));
                    }
                
                    // Coins & XP aktualisieren

                    let harvestImage;

                    if (harvestedPlants.length === 1) {
                        harvestImage = harvestedPlants[0].image;
                    } else {
                        harvestImage = 'https://xstrikers.de/discord/images/farming.png';
                    }

                    await pool.execute('UPDATE discord_user SET coins = coins + ? WHERE discord_id = ?', [totalReward, userId]);
                    await pool.execute('UPDATE farming SET current_xp = ?, level = ?, xp_needed = ? WHERE discord_id = ?',
                        [newXP, newLevel, newXPNeeded, userId]);
                
                    const embed = new EmbedBuilder()
                        .setTitle('🚜 Ernte erfolgreich')
                        .setDescription(harvestedPlants.map(p =>
                            `Bei deinem **${p.name}-Feld** hast du **${p.reward} XS-Coins** und **${p.xp} XP** erhalten.`
                        ).join('\n') + `\n\nDeine gesamte Ernte hat dir **${totalReward} XS-Coins** und **${totalXP} XP** eingebracht.`)
                        .setColor(0x26d926)
                        .setImage(harvestImage);
                
                    return interaction.reply({ embeds: [embed, ...levelUpEmbeds] });
                }
                        
                // --------------- 📊 Status ----------------
                if (interaction.options.getSubcommand() === 'status') {
                    let planted = [];
                    for (const slot of slots) {
                        const plantName = farmData[slot.type];
                        if (plantName) {
                            const plant = plants[plantName];
                            const timeDiff = (currentDate - new Date(farmData[slot.time])) / 60000;
                            if (timeDiff >= plant.cooldown) {
                                planted.push(`**${plantName}** ist bereit zur Ernte!`);
                            } else {
                                planted.push(`**${plantName}** wächst noch **${Math.ceil(plant.cooldown - timeDiff)} Minuten**.`);
                            }
                        }
                    }
        
                    const statusMsg = planted.length > 0 ? planted.join('\n') : '🌱 Du hast momentan nichts gepflanzt.';
        
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🌾 Dein Farming-Status')
                            .setDescription(`Level: **${level}**\nXP: **${current_xp} / ${xp_needed}**\n\n${statusMsg}`)
                            .setColor(0x26d926)
                            .setImage('https://xstrikers.de/discord/images/farm.png')]
                    });
                }
        
            } catch (error) {
                console.error(error);
                return interaction.reply({ content: 'Es ist ein Fehler aufgetreten.', flags: 64 });
            }
        }
};
