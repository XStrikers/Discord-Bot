import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Führe einen Fahrer mit einem LKW zusammen.')
    .addSubcommand(sub =>
      sub.setName('merge')
        .setDescription('Weise einem Fahrer einen LKW zu.')
        .addStringOption(option =>
          option.setName('driver')
            .setDescription('Name des Fahrers')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('truck')
            .setDescription('Name des LKWs')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const driverName = interaction.options.getString('driver');
    const truckName = interaction.options.getString('truck');

    // Verwende deferReply, um Discord mitzuteilen, dass die Antwort länger dauert
    await interaction.deferReply({ flags: 64 });

    // Überprüfen, ob der Benutzer eine aktive Tour hat
    const [activeTours] = await db.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? AND status = 'driving'`,
      [userId]
    );

    if (activeTours.length > 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Aktive Tour')
            .setDescription('Du kannst keinen Fahrer und LKW zusammenführen, solange du eine aktive Tour hast. Beende zuerst deine Tour.')
            .setColor(0xd92626)
        ],
      });
      return;
    }

    // Überprüfen, ob der Fahrer existiert und keinem LKW zugewiesen wurde
    const [driverExists] = await db.execute(
      `SELECT * FROM lkw_driver_truck_assignment WHERE driver_name = ? AND discord_id = ? AND (truck_name IS NULL OR truck_name = '')`,
      [driverName, userId]
    );

    if (driverExists.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht vorhanden')
            .setDescription(`Es gibt keinen Fahrer mit dem Namen **${driverName}**, der keinem LKW zugewiesen wurde.`)
            .setColor(0xd92626)
        ],
      });
      return;
    }

    // Überprüfen, ob der LKW existiert und inaktiv ist
    const [truckExists] = await db.execute(
      `SELECT * FROM lkw_trucks WHERE name = ? AND discord_id = ? AND active = 0`,
      [truckName, userId]
    );

    if (truckExists.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht zur Verfügung')
            .setDescription(`Der LKW **${truckName}** ist entweder nicht vorhanden oder bereits aktiv.`)
            .setColor(0xd92626)
        ],
      });
      return;
    }

    // Führe die Zuordnung des Fahrers zum LKW aus
    await db.execute(
      `UPDATE lkw_driver_truck_assignment 
      SET truck_name = ? 
      WHERE driver_name = ? AND discord_id = ?`,
      [truckName, driverName, userId]
    );

    // Update den Status des LKWs auf "active"
    await db.execute(
      `UPDATE lkw_trucks 
      SET active = 1 
      WHERE name = ? AND discord_id = ?`,
      [truckName, userId]
    );

    // Bestätigung
    await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('👍 Erfolgreiche Zuweisung')
            .setDescription(`Der Fahrer **${driverName}** wurde erfolgreich dem LKW **${truckName}** zugewiesen.`)
            .setColor(0x26d926)
        ],
    });
  }
};

