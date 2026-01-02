import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Erstelle dir ein Fahrerprofil.')
    .addSubcommand(subcommand =>
      subcommand.setName('begin')
        .setDescription('Beginne deine LKW-Karriere und registriere dich.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    const [users] = await db.execute(
      `SELECT id FROM lkw_users WHERE discord_id = ?`,
      [userId]
    );

    if (users.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`<:ets2:1379062821924507721> Bereits eingestellt`)
            .setDescription(`Du bist bereits bei unserer Spedition registriert und eingestellt.\n\nVerwende bitte \`/lkw start\` um dir aktuelle Aufträge anzeigen zu lassen.`)
            .setColor(0xd98226)
            .setImage('https://xstrikers.de/discord/images/truck_start.png')
        ],
        flags: 64
      });
    }

    // Benutzer eintragen
    await db.execute('INSERT INTO lkw_users (discord_id, username) VALUES (?, ?)', [userId, displayName]);

    // Starter-Truck
    await db.execute(
      `INSERT INTO lkw_trucks (discord_id, name, active) VALUES (?, 'Starter Truck', 1)`,
      [userId]
    );

    // Embed-Bestätigung
    const embed = new EmbedBuilder()
      .setTitle(`<:ets2:1379062821924507721> Willkommen bei deiner LKW Tour, ${displayName}`)
        .setDescription(
        `Nachdem wir deine Unterlagen geprüft und ein Gespräch mit dir geführt haben, konnten wir dein Potenzial erkennen und dich in unser Team aufnehmen.\n\n` +
        `Du wurdest erfolgreich in unserem System registriert und hast deinen :articulated_lorry: **Starter-Truck** erhalten.\n` +
        `Starte jetzt durch und gib \`/lkw start\` ein, um deine ersten Aufträge zu sehen und wähle einen aus, um deinen LKW zu beladen.`
        )
      .setColor(0x26d926)
      .setImage('https://xstrikers.de/discord/images/truck_start.png');

    return interaction.reply({
      embeds: [embed],
      flags: 0
    });
  }
};

