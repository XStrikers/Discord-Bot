import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

const challenges = new Map();
const maxBet = 1000;

export default {
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Spiele Battle Dice gegen einen anderen Spieler.')
    .addSubcommand(sub =>
      sub.setName('dice')
        .setDescription('Fordere einen anderen Spieler zu einem Dice Battle heraus.')
        .addUserOption(opt => opt.setName('user').setDescription('Gegner').setRequired(true))
        .addIntegerOption(opt => opt.setName('einsatz').setDescription('Einsatz in Coins').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('accept')
        .setDescription('Akzeptiere eine Battle Dice Herausforderung.')
    )
    .addSubcommand(sub =>
      sub.setName('reject')
        .setDescription('Lehne eine Battle Dice Herausforderung ab.')
    ),

    async execute(interaction) {

        const allowedChannelId = '1382047851512856667';

        if (interaction.channelId !== allowedChannelId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                    .setTitle(':x: Game nicht vorhanden')
                    .setDescription(`Das Minigame **🎲 Battle Dice** befindet sich im Channel <#1382047851512856667> und kann nur dort gespielt werden.`)
                    .setColor(0xd92626)
                    .setImage('https://xstrikers.de/discord/images/truck_loading.png')
                ],
                flags: 64
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const challengerId = interaction.user.id;

        if (subcommand === 'dice') {
            const opponent = interaction.options.getUser('user');
            const opponentId = opponent.id;
            const challengerName = interaction.member.displayName;
            const opponentName = opponent.username;

            const bet = interaction.options.getInteger('einsatz');

            if (challengerId === opponentId) {
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('❌ Abgelehnt')
                        .setDescription(`Du kannst dich nicht selbst herausfordern.`)
                        .setColor(0xd92626)
                    ],
                    flags: 64
                });
            }

            if (bet > maxBet || bet <= 0) {
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('<:xscoins:1346851584985792513> Maximaler Einsatz')
                        .setDescription(`Der maximale Einsatz ist ${maxBet} <:xscoins:1346851584985792513>`)
                        .setColor(0xd92626)
                    ],
                    flags: 64
                });
            }

            const [challengerRow] = await db.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [challengerId]);
            const [opponentRow] = await db.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [opponentId]);

            if (!challengerRow.length || challengerRow[0].coins < bet) {
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('<:xscoins:1346851584985792513> Nicht genügend')
                        .setDescription(`Du hast nicht genügend <:xscoins:1346851584985792513> für diesen Einsatz.`)
                        .setColor(0xd92626)
                    ],
                    flags: 64
                });
            }
            if (!opponentRow.length || opponentRow[0].coins < bet) {
                return await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('<:xscoins:1346851584985792513> Nicht genügend')
                        .setDescription(`Der herausgeforderte User hat nicht genügend <:xscoins:1346851584985792513>.`)
                        .setColor(0xd92626)
                    ],
                    flags: 64
                });
            }

            // Prüfe, ob bereits eine Herausforderung existiert
            const existingChallenge = challenges.get(opponentId);
            if (existingChallenge && existingChallenge.challengerId === challengerId) {
                const elapsed = Date.now() - existingChallenge.timestamp;
                const cooldown = 5 * 60 * 1000;

                if (elapsed < cooldown) {
                    const remaining = cooldown - elapsed;
                    const remainingSeconds = Math.floor((remaining / 1000) % 60);
                    const remainingMinutes = Math.floor(remaining / (60 * 1000));

                    const timeString = remainingMinutes > 0
                    ? `${remainingMinutes} Minuten und ${remainingSeconds} Sekunden`
                    : `${remainingSeconds} Sekunden`;

                    return await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(':hourglass_flowing_sand: Bereits herausgefordert')
                                .setDescription(`**${opponentName}** wurde bereits vor kurzem von dir herausgefordert um **${existingChallenge.bet}** <:xscoins:1346851584985792513>\nBitte warte **${timeString}**, bevor du es erneut versuchst.`)
                                .setColor(0xd98226)
                        ],
                        flags: 64
                    });
                } else {
                    // Alte Herausforderung ist abgelaufen, löschen
                    challenges.delete(opponentId);
                }
            }

            // Neue Herausforderung setzen mit Zeitstempel
            challenges.set(opponentId, { challengerId, bet, timestamp: Date.now() });

            return await interaction.reply({
                content: `<@${opponentId}>`,
                embeds: [
                    new EmbedBuilder()
                    .setTitle(':game_die: Herausforderung')
                    .setDescription(`.....wurde zu einem **🎲 Dice Battle** von **${challengerName}** um **${bet}** <:xscoins:1346851584985792513> herausgefordert. Die Herausforderung kann mit **\`/battle accept\`** angenommen oder mit **\`/battle reject\`** abgelehnt werden.`)
                    .setColor(0xd98226)
                ],
                flags: 0
            });

        } else if (subcommand === 'reject') {
            const challenge = challenges.get(challengerId);
            if (!challenge) return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':x: Keine Herausforderung')
                        .setDescription(`Du wurdest aktuell nicht herausgefordert.`)
                        .setColor(0xd92626)
                ],
                flags: 64
            });

            const opponentId = challenge.challengerId;

            const challengerUser = await interaction.guild.members.fetch(challengerId);
            const opponentUser = await interaction.guild.members.fetch(opponentId);
            const challengerName = challengerUser.displayName;
            const opponentName = opponentUser.displayName;

            challenges.delete(challengerId);
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':thumbsdown: Abgelehnt')
                        .setDescription(`**${opponentName}** hat die Herausforderung von **${challengerName}** abgelehnt.`)
                        .setColor(0xd92626)
                ],
                flags: 0
            });
        }
        else if (subcommand === 'accept') {
            const challenge = challenges.get(challengerId);
            if (!challenge) return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':x: Keine Herausforderung')
                        .setDescription(`Du wurdest aktuell nicht herausgefordert.`)
                        .setColor(0xd92626)
                ],
                flags: 64
            });

            challenges.delete(challengerId);
            const { challengerId: opponentId, bet } = challenge;
            const totalBet = bet * 2;

            const challengerUser = await interaction.guild.members.fetch(challengerId);
            const opponentUser = await interaction.guild.members.fetch(opponentId);
            const challengerName = challengerUser.displayName;
            const opponentName = opponentUser.displayName;

            const roll = () => Math.floor(Math.random() * 6) + 1;

            const challengerRolls = [roll(), roll()];
            const challengerTotal = challengerRolls[0] + challengerRolls[1];

            const userRolls = [roll(), roll()];
            const userTotal = userRolls[0] + userRolls[1];

            // Embed-Grundstruktur
            const embed = new EmbedBuilder()
                .setTitle('🎲 Battle Dice')
                .setColor(0x26d926)
                .setDescription(`**Beide Spieler haben die Herausforderung akzeptiert**\n\n\n**${opponentName}** vs. **${challengerName}**\n**Gesamteinsatz:** ${totalBet} <:xscoins:1346851584985792513>\n\n🕐 Vorbereitung...`)
                .setImage('https://xstrikers.de/discord/images/dice.png');

            // Erste Nachricht senden
            await interaction.reply({ embeds: [embed] });

            const update = async (text, color = null) => {
                if (color) embed.setColor(color);
                embed.setDescription(text);
                await interaction.editReply({ embeds: [embed] });
            };

            // Kurze Pause
            await new Promise(r => setTimeout(r, 2500));

            // Spieler A (opponent) würfelt
            await update(
                `**Beide Spieler haben die Herausforderung akzeptiert.**\n\n\n**${opponentName}** vs. **${challengerName}**\n**Gesamteinsatz:** ${totalBet} <:xscoins:1346851584985792513>\n\n**${opponentName}** würfelt...\n\nEs wurde eine **${challengerRolls[0]}** und **${challengerRolls[1]}** gewürfelt.\nDas macht zusammen eine **${challengerTotal}**.`,
                0x1abc9c
            );

            await new Promise(r => setTimeout(r, 2500));

            // Spieler B (challenger) würfelt
            await update(
                `**Beide Spieler haben die Herausforderung akzeptiert.**\n\n\n**${opponentName}** vs. **${challengerName}**\n**Gesamteinsatz:** ${totalBet} <:xscoins:1346851584985792513>\n\n**${opponentName}** hatte eine **${challengerRolls[0]}** und **${challengerRolls[1]}** gewürfelt.\nDas macht zusammen eine **${challengerTotal}**.\n\n${challengerName} würfelt...\n\nDie Würfel zeigen **${userRolls[0]}** und **${userRolls[1]}**.\nDas ergibt zusammen die Zahl **${userTotal}**.`,
                0xd98226
            );

            await new Promise(r => setTimeout(r, 2500));

            // Ergebnis berechnen
            let resultText = '';
            let winnerId = null;
            let loserId = null;

            if (userTotal > challengerTotal) {
                resultText = `**${challengerName}** hat mit **${userTotal}** gegen **${opponentName}** mit **${challengerTotal}** gewonnen.\n\n**${challengerName}** hat den Gewinn in Höhe von **${totalBet}** <:xscoins:1346851584985792513> bekommen.`;
                winnerId = challengerId;
                loserId = opponentId;
            } else if (userTotal < challengerTotal) {
                resultText = `**${opponentName}** hat mit **${challengerTotal}** gegen **${challengerName}** mit **${userTotal}** gewonnen.\n\n**${opponentName}** hat den Gewinn in Höhe von **${totalBet}** <:xscoins:1346851584985792513> bekommen.`;
                winnerId = opponentId;
                loserId = challengerId;
            } else {
                resultText = `**${challengerName}** hat mit **${userTotal}** gegen **${opponentName}** mit **${challengerTotal}** einen Unentschieden erzielt.\n\n Jeder hat seinen Einsatz wieder zurück bekommen.`;
            }

            // Datenbank-Update
            if (winnerId && loserId) {
                await db.execute('UPDATE discord_user SET coins = coins + ?, current_xp = current_xp + ? WHERE discord_id = ?', [bet, 25, winnerId]);
                await db.execute('UPDATE discord_user SET coins = coins - ?, current_xp = current_xp + ? WHERE discord_id = ?', [bet, 10, loserId]);
            }

            await update(
                `**Das Battle wurde beendet und der Sieger steht fest.**\n\n${resultText}\n\nBeide Spieler reichen sich die Hände und verlassen dann im Anschluss den Spieltisch.`,
                0x26d926
            );
        }
    }
};
