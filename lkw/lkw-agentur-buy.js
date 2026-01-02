import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import { firstNames, lastNames } from './agentur-names.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Kaufe einen neuen Fahrer für deine Logistik.')
    .addSubcommand(sub =>
      sub.setName('da-buy')
        .setDescription('Kaufe einen neuen Fahrer für deine Logistik.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // 1. Überprüfe, ob der Benutzer eine Logistik hat
    const [logistics] = await db.execute(
      `SELECT * FROM lkw_logistics WHERE discord_id = ?`,
      [userId]
    );

    if (logistics.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Keine Logistik gefunden')
            .setDescription('Du musst zuerst eine Logistik gründen, bevor du einen Fahrer einstellen kannst. Erstelle deine Logistik mit \`/lkw logistics-create name:\`')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    const logisticsData = logistics[0];

    // 2. Überprüfen, ob der Benutzer eine aktive Tour hat
    const [activeTours] = await db.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? AND status = 'driving'`,
      [userId]
    );

    if (activeTours.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Aktive Tour')
            .setDescription('Du kannst keinen neuen Fahrer einstellen, solange du eine aktive Tour hast. Beende deine Tour zuerst.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // 3. Abrufen der TruckMiles des Benutzers
    const [userRows] = await db.execute(
      `SELECT truckmiles FROM lkw_users WHERE discord_id = ?`,
      [userId]
    );

    const userTruckMiles = userRows[0].truckmiles;

    // Berechnen der Kosten für den nächsten Fahrer
    const numberOfDrivers = logisticsData.drivers ? logisticsData.drivers.split(',').length : 0;
    const costForNextDriver = 5000 + (numberOfDrivers * 2000);

    // 4. Überprüfen, ob der Benutzer genügend TruckMiles hat
    if (userTruckMiles < costForNextDriver) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht genug TruckMiles')
            .setDescription(`Du benötigst **${costForNextDriver.toLocaleString()}** <:truckmiles:1388239050963681362> um einen weiteren Fahrer einzustellen.`)
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // 5. TruckMiles abziehen und Fahrer zur Logistik hinzufügen
    await db.execute(
      `UPDATE lkw_users SET truckmiles = truckmiles - ? WHERE discord_id = ?`,
      [costForNextDriver, userId]
    );

    // 6. Füge den neuen Fahrer zur Logistik hinzu (Vorname und Nachname zufällig generieren)
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const newDriver = `${randomFirstName} ${randomLastName}`;
    const updatedDrivers = logisticsData.drivers ? `${logisticsData.drivers}, ${newDriver}` : newDriver;

    // 7. Sicherstellen, dass newDriver und logistics.id gültige Werte haben
    if (!newDriver || !logisticsData.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler beim Speichern des Fahrers')
            .setDescription('Es gab ein Problem bei der Zuweisung des Fahrers zur Datenbank. Bitte versuche es später erneut.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // Fahrer in die Logistik einfügen
    await db.execute(
      `UPDATE lkw_logistics SET drivers = ? WHERE discord_id = ?`,
      [updatedDrivers, userId]
    );

    // 8. Fahrer auch in der lkw_driver_truck_assignment Tabelle speichern
    await db.execute(
      `INSERT INTO lkw_driver_truck_assignment (discord_id, driver_name, logistic_id) VALUES (?, ?, ?)`,
      [userId, newDriver, logisticsData.id]
    );

    // 9. Bestätigung des Erwerbs
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('💼 Fahrer erworben')
          .setDescription(`Du hast erfolgreich einen neuen Fahrer für deine Logistik eingestellt.\n\nFahrername: **${newDriver}**\n\nDein Logistik-Team wächst weiter und Du kannst nun noch mehr Aufträge annehmen und deine Logistik ausbauen.`)
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/agentur.png')
      ],
      flags: 0
    });
  }
};

