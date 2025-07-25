import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('complete')
        .setDescription('Schließe deinen aktuellen Auftrag ab und erhalte deine Belohnung.')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // 1. Tour mit Status 'driving' oder 'complete' finden
    const [tours] = await pool.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? AND status IN ('driving', 'complete') ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (tours.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ Kein laufender Auftrag')
            .setDescription('Aktuell hast du keine aktive Tour, die abgeschlossen werden kann.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    const tour = tours[0];
    const now = new Date();

    const endTime = new Date(tour.end_time);

    // 2. Falls Zeit abgelaufen: Status auf 'complete' setzen
    if (tour.status === 'driving' && now >= endTime) {
    await pool.execute(
      `UPDATE lkw_tours 
          SET status = 'complete' 
        WHERE id = ?`,
      [tour.id]
    );
     tour.status = 'complete';
   }

    // 3. Wenn noch nicht abgeschlossen
    if (tour.status !== 'complete') {

      const arrivalTime = endTime.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Berlin'
      });


      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🕓 Tour läuft noch')
            .setDescription(`Deine Lieferung **${tour.freight || 'Unbekannt'}** ist noch unterwegs nach **${tour.end_city}**.\nDu wirst um **${arrivalTime} Uhr** deine Tour beendet haben.\n\nBitte habe etwas Geduld, denn Qualität und Sicherheit gehen vor.`)
            .setColor(0xd98226)
            .setImage(`https://xstrikers.de/discord/images/truck_drive.png`)
        ],
        flags: 64
      });
    }

    // 4. Belohnung auslesen
    const earned_xp = tour.earned_xp || tour.xp || 0;
    const earned_truckmiles = tour.earned_truckmiles || tour.truckmiles || 0;

    // 5. Benutzerprofil abrufen
    const [userDataRows] = await pool.execute(
      `SELECT level, current_xp, needed_xp, truckmiles, total_tours FROM lkw_users WHERE discord_id = ?`,
      [userId]
    );

    if (userDataRows.length === 0) {
      return interaction.editReply({
        content: 'Fehler: Benutzerprofil nicht gefunden.',
        flags: 64
      });
    }

    let { level, current_xp, needed_xp, truckmiles: currentTruckMiles, total_tours } = userDataRows[0];

    current_xp += earned_xp;
    currentTruckMiles += earned_truckmiles;
    total_tours += 1;

    // 6. Level-Up Prüfung
    let leveledUp = false;
    let newLevel = level;

    while (current_xp >= needed_xp) {
      current_xp -= needed_xp;
      newLevel += 1;
      needed_xp = 100 + newLevel * 35;
      leveledUp = true;
    }

    // 7. Benutzer aktualisieren
    await pool.execute(
      `UPDATE lkw_users SET level = ?, current_xp = ?, needed_xp = ?, truckmiles = ?, total_tours = ? WHERE discord_id = ?`,
      [newLevel, current_xp, needed_xp, currentTruckMiles, total_tours, userId]
    );

    // 8. Tour löschen
    await pool.execute(
      `DELETE FROM lkw_tours WHERE id = ?`,
      [tour.id]
    );

    // 9. Überprüfen, ob der Benutzer eine Logistik hat
    const [logistics] = await pool.execute(
      `SELECT * FROM lkw_logistics WHERE discord_id = ?`,
      [userId]
    );

    if (logistics.length > 0) {
      // 10. Logistik: income_tm und total_tours in lkw_logistics Tabelle aktualisieren
      await pool.execute(
        `UPDATE lkw_logistics SET income_tm = income_tm + ?, total_tours = total_tours + 1 WHERE discord_id = ?`,
        [earned_truckmiles, userId]
      );
    }

    // 11. Abschlussübersicht
    const rewardEmbed = new EmbedBuilder()
      .setTitle('✅ Auftrag erfolgreich abgeschlossen')
      .setDescription(
        `Du bist sicher an dein Ziel angekommen und die Fracht **${tour.freight || 'Unbekannt'}** wurde ordnungsgemäß entladen.\n\n📦 **Belohnung erhalten:** ${earned_xp} Erfahrungspunkte & ${earned_truckmiles} <:truckmiles:1388239050963681362>\n\nDu hast damit deine Tour von **${tour.start_city}** nach **${tour.end_city}** erfolgreich beendet und kannst stolz auf deine Leistung sein.\nMach dich bereit für neue Herausforderungen, mit \`/lkw start\` beginnt dein nächstes Abenteuer auf den Straßen.`
      )
      .setColor(0x26d926)
      .setImage('https://xstrikers.de/discord/images/truck_complete.png');

    // 10. Optional: Separater Embed für Level-Up
    const embeds = [rewardEmbed];

    if (leveledUp) {
      const levelUpEmbed = new EmbedBuilder()
        .setTitle('🎉 Level-Up erreicht')
        .setDescription(`Du bist jetzt **Level ${newLevel}**.\nSei weiter auf Tour und zeige den anderen Fahrern, welche Logistik am stärksten ist.`)
        .setColor(0x26d926)
        .setImage('https://xstrikers.de/discord/images/levelup.png');

      embeds.push(levelUpEmbed);
    }

    return interaction.editReply({
      embeds,
      flags: 0
    });
  }
};
