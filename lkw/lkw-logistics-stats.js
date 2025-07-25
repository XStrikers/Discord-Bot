import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub.setName('logistics')
        .setDescription('Deine eigene Logistik.')
        .addStringOption(opt => 
          opt.setName('stats')
            .setDescription('Zeigt die Statistiken deiner Logistik an.')
        )),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Abrufen der Logistik-Daten
    const [logisticsRows] = await pool.execute(`SELECT * FROM lkw_logistics WHERE discord_id = ?`, [userId]);

    if (logisticsRows.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Keine Logistik gefunden')
            .setDescription('Du hast noch keine Logistik gegründet. Bitte gründe zuerst eine Logistik mit:\n\`/lkw logistics-create name:\`.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    const logistics = logisticsRows[0];

    // Zähler für die Anzahl der Fahrer
    const numberOfDrivers = logistics.drivers ? logistics.drivers.split(',').length : 0;
    const numberOfTrucks = logistics.trucks ? logistics.trucks.split(',').length : 0;


    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🚚 Logistik-Statistiken - **${logistics.logistic}**`)
          .setDescription(
            `**Angestellte:** ${numberOfDrivers || 'Keine Angestellte'}\n` +
            `**Trucks:** ${numberOfTrucks || 'Keine Trucks'}\n\n` +
            `**Einnahmen:** ${logistics.income_tm.toLocaleString()} <:truckmiles:1388239050963681362>\n` +
            `**Touren:** ${logistics.total_tours}\n\n` +
            `**Aktuelle Platzierung:** ???\n\n` +
            `Mögen die Logistiken fair zu einander bleiben und sich nicht gegenseitig auf den Straßen so wie bei den Aufträgen behindern.`
          )
          .setColor(0xd98226)
          .setImage('https://xstrikers.de/discord/images/logistics_stats.png')
      ],
      flags: 0
    });
  }
};
