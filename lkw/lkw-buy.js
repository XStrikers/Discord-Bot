import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Kaufe einen LKW für deine Logistik.')
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Kaufe einen neuen LKW für deine Logistik.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Abrufen der TruckMiles des Benutzers
    const [userRows] = await db.execute(
      `SELECT truckmiles FROM lkw_users WHERE discord_id = ?`,
      [userId]
    );
    const userTruckMiles = userRows[0].truckmiles;

    // Abrufen der Logistik-Daten
    const [logisticsRows] = await db.execute(
      `SELECT * FROM lkw_logistics WHERE discord_id = ?`,
      [userId]
    );

    if (logisticsRows.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Keine Logistik gefunden')
            .setDescription('Du musst zuerst eine Logistik gründen, bevor du einen LKW kaufen kannst. Erstelle deine Logistik mit \`/lkw logistics-create name:\`.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    const logistics = logisticsRows[0];

    // Berechne die Kosten für den nächsten LKW
    const numberOfTrucks = logistics.trucks ? logistics.trucks.split(',').length : 0;
    const costForNextTruck = 10000 + (numberOfTrucks * 5000);

    // Überprüfen, ob der Benutzer genügend TruckMiles hat
    if (userTruckMiles < costForNextTruck) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht genug TruckMiles')
            .setDescription(`Du benötigst **${costForNextTruck.toLocaleString()}** <:truckmiles:1388239050963681362> um einen weiteren LKW zu kaufen.`)
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // TruckMiles abziehen
    await db.execute(
      `UPDATE lkw_users SET truckmiles = truckmiles - ? WHERE discord_id = ?`,
      [costForNextTruck, userId]
    );

    // Neuen LKW zu den bestehenden Trucks hinzufügen
    const newTruck = `Truck_${numberOfTrucks + 1}`;
    const updatedTrucks = logistics.trucks ? `${logistics.trucks}, ${newTruck}` : newTruck;

    // Aktualisiere die Logistik-Daten mit dem neuen LKW
    await db.execute(
      `UPDATE lkw_logistics SET trucks = ? WHERE discord_id = ?`,
      [updatedTrucks, userId]
    );

    // LKW auch in der Tabelle 'lkw_trucks' speichern
    // Überprüfen, ob die discord_id in lkw_users existiert, bevor wir den LKW speichern
    const [userExists] = await db.execute(
      `SELECT * FROM lkw_users WHERE discord_id = ?`,
      [userId]
    );

    if (userExists.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler beim Speichern des LKW')
            .setDescription('Es wurde ein Problem beim Speichern des LKWs in der Datenbank festgestellt. Bitte versuche es später erneut.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // LKW in der lkw_trucks Tabelle speichern
    await db.execute(
        `INSERT INTO lkw_trucks (name, speed_level, trailer_level, eco_level, tank_level, state, logistic_id, discord_id, active) 
        VALUES (?, 0, 0, 0, 0, 0, ?, ?, 0)`,
        [newTruck, logistics.id, userId]
    );

    // Bestätigung des Kaufs
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚚 Neuer LKW gekauft')
          .setDescription(
            `**Herzlichen Glückwunsch**\n\nDu hast erfolgreich den LKW **${newTruck}** für deine Logistik gekauft.\n\n` +
            `Dein Fuhrpark wächst weiter und du kannst nun noch mehr Angestellte einsetzen und dein Fuhrpark ausbauen.`
          )
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/truck_buy.png')
      ],
      flags: 0
    });
  }
};

