import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Besuche den LKW-Shop.')
    .addSubcommand(sub =>
      sub.setName('shop')
        .setDescription('Besuche den LKW-Shop und erfahre, wie du einen LKW kaufen kannst.')
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

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚚 Willkommen im LKW-Shop')
          .setDescription(
            `Im LKW-Shop kannst du neue LKWs für deine Logistik erwerben.\n\n` +
            `**Preis pro LKW beträgt ${costForNextTruck.toLocaleString()}** <:truckmiles:1388239050963681362>\n\n` +
            `Wenn du genug TruckMiles hast, kannst du einen LKW durch den Befehl \`/lkw buy\` kaufen.\n\n` +
            `Viel Spaß beim Einkaufen und gutes Gelingen auf deinen zukünftigen Touren.`
          )
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/truck_shop.png')
      ],
      flags: 0
    });
  }
};

