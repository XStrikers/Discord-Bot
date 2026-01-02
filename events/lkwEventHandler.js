import { EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import { calculateModifiedJob } from '../lkw/tuningHelper.js';

export default {
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('select_job_')) return;

    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const jobIndex = parseInt(interaction.customId.split('_').pop(), 10) - 1;

    // 🧾 Aktive Tour prüfen
    const [activeTours] = await db.execute(
      `SELECT id FROM lkw_tours WHERE discord_id = ? AND status IN ('accept', 'loading', 'ready_to_drive', 'driving') LIMIT 1`,
      [userId]
    );

    if (activeTours.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ Bereits ein aktiver Auftrag')
            .setDescription('Bitte schließe deinen aktuellen Auftrag ab, bevor du einen neuen annimmst.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    // 🚛 Aktiven Truck laden
    const [trucks] = await db.execute(
      'SELECT id FROM lkw_trucks WHERE discord_id = ? AND active = 1 LIMIT 1',
      [userId]
    );

    if (trucks.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Kein Truck gefunden')
            .setDescription('Bitte kaufe oder aktiviere einen Truck, bevor du Aufträge annehmen kannst.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    const truckId = trucks[0].id;

    // 🧊 Aufträge aus Cache laden
    const [cachedJobs] = await db.execute(
      `SELECT * FROM lkw_tours_cache WHERE discord_id = ? ORDER BY id ASC LIMIT 2`,
      [userId]
    );

    // Tuning-Daten für den aktiven Truck laden
    const [truckTuningRows] = await db.execute(
      `SELECT speed_level, eco_level, trailer_level, tank_level FROM lkw_trucks WHERE id = ? LIMIT 1`,
      [truckId]
    );

    const tuning = {
      speed_level: truckTuningRows[0]?.speed_level || 0,
      eco_level: truckTuningRows[0]?.eco_level || 0,
      trailer_level: truckTuningRows[0]?.trailer_level || 0,
      tank_level: truckTuningRows[0]?.tank_level || 0
    };

    if (!cachedJobs[jobIndex]) {
      return interaction.reply({
        content: '❌ Auftrag nicht mehr verfügbar. Bitte führe `/lkw start` erneut aus.',
        flags: 64
      });
    }

    const job = cachedJobs[jobIndex];
    const durationMinutes = job.duration_minutes;

    // Start- und Endzeit berechnen
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60000);

    const [modDuration, modXp, modTruckMiles] = calculateModifiedJob(
      tuning,
      durationMinutes,
      job.xp,
      job.truckmiles
    );

    try {
      // 📥 In Haupt-Tour-Tabelle eintragen
      await db.execute(`
        INSERT INTO lkw_tours (
          discord_id, truck_id, start_city, end_city, freight, duration_minutes, loading_start_time, loading_end_time, status, earned_xp, earned_truckmiles, accident, traffic_jam, fine_generated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        truckId,
        job.start_city,
        job.end_city,
        job.freight,
        modDuration,
        now,
        new Date(now.getTime() + modDuration * 60000),
        'accept',
        modXp,
        modTruckMiles,
        false,
        false,
        false
      ]);

      // ✅ Antwort an User

      const multiplierNotice = job.multiplier
        ? "**Multiplikator aktiv:** Deine Fahrtzeit hat sich erhöht aufgrund spezieller Transportanforderungen. Dadurch bekommst du auch mehr Erfahrungen und mehr TruckMiles.\n\n"
        : "";

      const embed = new EmbedBuilder()
        .setTitle(`📋 Auftrag ${job.freight} angenommen`)
        .setDescription(
          `**Auftragnehmer:** ${displayName}\n\n` +
          `**Start ➜ Ziel**\n${job.start_city} ➜ ${job.end_city}\n\n` +
          `**Fahrtzeit:** ${Math.floor(modDuration / 60)} Std ${modDuration % 60} Min\n\n` +
          `${multiplierNotice}`+       
          `**Erfahrung & TruckMiles**\n${modXp} XP • ${modTruckMiles} <:truckmiles:1388239050963681362>\n\n` +
          `Starte jetzt mit \`/lkw load\`, um deinen LKW zu beladen.`
        )
        .setColor(0x26d926)
        .setImage('https://xstrikers.de/discord/images/truck_start.png');

      await interaction.reply({
        embeds: [embed],
        flags: 0
      });

      // 🧹 Optional: Job-Cache nach Annahme löschen
      await db.execute(`DELETE FROM lkw_tours_cache WHERE discord_id = ?`, [userId]);

    } catch (error) {
      console.error('❌ Fehler beim Speichern des Auftrags:', error);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler beim Starten')
            .setDescription('Beim Starten deines Auftrags ist ein unerwarteter Fehler aufgetreten.\nBitte versuche es erneut oder kontaktiere den Support.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/error_truck.png')
        ],
        flags: 64
      });
    }
  }
};

