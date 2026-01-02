import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub.setName('agentur')
        .setDescription('Stelle einen neuen Fahrer für deine Logistik ein.')
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

    // Berechnen der Kosten für den nächsten Fahrer
    const numberOfDrivers = logistics[0].drivers ? logistics[0].drivers.split(',').length : 0;
    const costForNextDriver = 5000 + (numberOfDrivers * 2000);

    // 4. Preis für den nächsten Fahrer anzeigen
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('💼 Willkommen bei der Driver-Agentur')
          .setDescription(
            `Du kannst hier einen neuen Fahrer für deine Logistik einstellen.\n\n` +
            `**Preis für den nächsten Fahrer beträgt ${costForNextDriver.toLocaleString()}** <:truckmiles:1388239050963681362>\n\n` +
            `Wenn du genug TruckMiles hast, kannst du einen Fahrer durch den Befehl \`/lkw da-buy\` kaufen.\n\n` +
            `Viel Spaß beim Einkaufen!`
          )
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/agentur.png')
      ],
      flags: 0
    });
  }
};

