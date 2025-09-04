// lkw-driver-start.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import { getRandomCity } from './cities.js';
import { getRandomFreightType } from './freightTypes.js';

export default {
  data: new SlashCommandBuilder()
    .setName('driver-tour')
    .setDescription('Starte eine neue Tour mit deinem LKW')
    .addIntegerOption(option =>
      option
        .setName('lkw')
        .setDescription('Nummer deines LKWs (z.B. 1 für Truck_1)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const lkwNumber = interaction.options.getInteger('lkw');
    const truckName = `Truck_${lkwNumber}`;

    // 1) Truck anhand des Namens finden und prüfen, ob er aktiv ist
    let truck;
    try {
      const [rows] = await pool.query(
        `SELECT * FROM lkw_trucks 
         WHERE discord_id = ? AND name = ? AND active = 1`,
        [discordId, truckName]
      );
      if (rows.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Keine Tour')
              .setDescription(`Du hast keinen aktiven LKW mit dem Namen **${truckName}**. Verwende \`/lkw drivers-and-trucks\`.`)
              .setColor(0xd92626)
              .setImage('https://xstrikers.de/discord/images/logistics_stats.png')
          ],
          flags: 64
        });
      }
      truck = rows[0];
    } catch (err) {
      console.error('DB-Fehler beim Truck-Check:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Technischer Fehler')
            .setDescription('Ein technischer Fehler ist aufgetreten. Bitte versuche es später erneut.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    // === Fahrername aus lkw_driver_truck_assignment laden ===
    let driverName = 'unbekannter Fahrer';
    try {
      const [assignRows] = await pool.query(
        `SELECT driver_name
         FROM lkw_driver_truck_assignment
         WHERE discord_id = ? AND truck_name = ?
         ORDER BY assigned_at DESC
         LIMIT 1`,
        [discordId, truckName]
      );
      if (assignRows.length > 0) {
        driverName = assignRows[0].driver_name;
      }
    } catch (err) {
      console.error('DB-Fehler beim Laden des Fahrers:', err);
    }

    // ─────────────── Prüfen, ob bereits eine Tour läuft ───────────────
    try {
      const [activeTours] = await pool.query(
        `SELECT id FROM lkw_tours
         WHERE truck_id = ? AND status = 'driving'`,
        [truck.id]
      );
      if (activeTours.length > 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🚛 Bereits unterwegs')
              .setDescription(`Dein Angestellter **${driverName}** ist mit dem LKW **${truckName}** bereits auf einer Tour und kann keine weiteren Aufträge annehmen.`)
              .setColor(0xd98226)
              .setImage('https://xstrikers.de/discord/images/logistics_infos.png')
          ],
          flags: 64
        });
      }
    } catch (err) {
      console.error('DB-Fehler beim Active-Tour-Check:', err);
    }

    // 2) Zufällige Städte und Fracht
    const startCity = getRandomCity();
    const endCity   = getRandomCity([startCity]);
    const freight   = getRandomFreightType();

    // 3) Lade- und Fahrtzeiten berechnen
    const loadingDuration = Math.floor(Math.random() * 6) + 5; // 5–10 Min
    const baseMinutes = 60; // Standardzeit für einfache Tour
    const duration = Math.floor(baseMinutes * freight.durationMultiplier);

    // Lokale Zeit als UTC speichern
    const nowLocal = new Date();
    const loadingStart = new Date(Date.UTC(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      nowLocal.getDate(),
      nowLocal.getHours(),
      nowLocal.getMinutes(),
      nowLocal.getSeconds()
    ));
    const loadingEnd = new Date(loadingStart.getTime() + loadingDuration * 60_000);

    // Fahrtbeginn und -ende
    const startTime = loadingEnd;
    const endTime   = new Date(startTime.getTime() + duration * 60_000);

    // 4) Tour in DB einfügen
    try {
      await pool.query(
        `INSERT INTO lkw_tours
         (discord_id, truck_id, loading_start_time, loading_end_time,
          start_city, end_city, freight, duration_minutes,
          start_time, end_time, status, earned_xp, earned_truckmiles,
          accident, traffic_jam, fine_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          discordId,
          truck.id,
          loadingStart,
          loadingEnd,
          startCity,
          endCity,
          freight.name,
          duration,
          startTime,
          endTime,
          'driving',
          freight.baseXp,
          freight.baseMiles,
          false,
          false,
          0
        ]
      );
    } catch (err) {
      console.error('DB-Fehler beim Anlegen der Tour:', err);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Keine Tour')
            .setDescription('Aus technischen Gründen konnte keine Tour angelegt werden.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    // 5) Rückmeldung im Discord
    const arrivalTime = new Date(endTime).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const embed = new EmbedBuilder()
      .setTitle(`🚛 Tour mit ${driverName} gestartet`)
      .setDescription(
        `\n\n` +
        `**Start ➜ Ziel**\n${startCity} ➜ ${endCity}\n\n` +
        `**Fracht:** ${freight.name}\n` +
        `**Ankunftszeit:** ${arrivalTime} Uhr\n\n` +
        `**TruckMiles:** ${freight.baseMiles.toLocaleString()} <:truckmiles:1388239050963681362>\n\n\n\n`
      )
      .setImage('https://xstrikers.de/discord/images/truck_drive.png');

    await interaction.reply({ embeds: [embed] });
  }
};
