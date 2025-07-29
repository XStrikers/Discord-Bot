import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../economy.js';
import { updateLoadingStatus } from './checkLoadingStatus.js';
import { fineReasons } from './fineReasons.js';
import crypto from 'crypto';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('drive')
        .setDescription('Starte deine Tour – sobald der LKW fertig beladen ist.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;

    // Hilfsfunktion für random Fine Code
    function generateFineCode(length = 5) {
      return crypto.randomBytes(length).toString('base64').replace(/[^A-Z]/gi, '').substring(0, length).toUpperCase();
    }

    // Füge in drive.js nach erfolgreichem Tourstart ein:
    function schedulePoliceChecks(discordId, durationMinutes, interaction) {
      const oneThird = Math.floor(durationMinutes / 3);
      const twoThirds = Math.floor(durationMinutes * 2 / 3);
      const timings = [oneThird, twoThirds];

      for (const delayMinutes of timings) {
        setTimeout(async () => {
          const giveFine = Math.random() < 0.15;
          if (!giveFine) return;

          const [fineCountRows] = await pool.execute(
            `SELECT COUNT(*) AS count FROM lkw_fines WHERE discord_id = ? AND paid = false`,
            [discordId]
          );

          const openFines = fineCountRows[0].count;
          if (openFines >= 10) return;
          
          const fine = fineReasons[Math.floor(Math.random() * fineReasons.length)];
          const code = generateFineCode();

          await pool.execute(
            `INSERT INTO lkw_fines (discord_id, reason, amount, code) VALUES (?, ?, ?, ?)`,
            [discordId, fine.reason, fine.amount, code]
          );

          // Erstelle das Datum im gewünschten Format
          const createdAt = new Date().toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          // Formatieren des Datums mit " - Uhr" am Ende
          const formattedDate = createdAt.replace(',', ' -') + ' Uhr';

          // Öffentliche Benachrichtigung, nicht per DM
          await interaction.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`🚨 Strafzettel CODE: ${code}`)
                .setDescription(
                  `Die Polizei hat **${displayName}** auf frischer Tat erwischt und haben einen Strafzettel vergeben.\n\n` +
                  `**Grund:** ${fine.reason}\n` +
                  `**Bußgeld:** ${fine.amount.toLocaleString()} <:truckmiles:1388239050963681362>\n\n` +
                  `Erstellt am ${formattedDate}`
                )
                .setImage(fine.image)
                .setColor(0xd92626)
            ],
            flags: 0
          });

        }, delayMinutes * 60000); // Wartezeit in Millisekunden
      }
    }

    // 1. Prüfen, ob bereits eine aktive Fahrt läuft
    const [activeTours] = await pool.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? AND status = 'driving' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (activeTours.length > 0) {
      const active = activeTours[0];
      const remainingMs = new Date(active.end_time) - new Date();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

      const arrivalTime = new Date(active.end_time).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🚛 Du bist bereits unterwegs')
            .setDescription(
              `Du fährst aktuell von **${active.start_city}** nach **${active.end_city}** mit der Fracht **${active.freight || 'Unbekannt'}**.\n\n` +
              `Ankunftszeit: **${arrivalTime} Uhr**\n\n` +
              `Bitte beende erst diese Tour, bevor du eine neue starten kannst.`
            )
            .setColor(0x26d926)
            .setImage('https://xstrikers.de/discord/images/truck_drive.png')
        ],
        flags: 0
      });
    }

    // 🚫 Fahrverbot prüfen: Hat der Spieler 10 oder mehr offene Strafzettel?
    const [fineRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM lkw_fines WHERE discord_id = ? AND paid = false`,
      [userId]
    );

    // Hier überprüfen wir, ob der User weniger als 10 offene Strafzettel hat, bevor die Tour startet
    if (fineRows[0].count >= 10) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🚫 Fahrverbot erteilt')
            .setDescription(
              `Du hast aktuell **${fineRows[0].count}** offene Strafzettel und darfst keine weiteren Touren fahren.\n\n` +
              `Bitte bezahle mindestens einen Strafzettel mit \`/lkw fines CODE\`, um das Verbot aufzuheben.`
            )
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/police_fine.png')
        ],
        flags: 64
      });
    }

    // ⏱️ Ladezeit prüfen und ggf. auf "ready_to_drive" setzen
    await updateLoadingStatus(userId);

    // Aktive Tour suchen
    const [tours] = await pool.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? AND status = 'ready_to_drive' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (tours.length === 0) {
      const [pendingTours] = await pool.execute(
        `SELECT * FROM lkw_tours WHERE discord_id = ? AND status = 'loading' ORDER BY id DESC LIMIT 1`,
        [userId]
      );

      if (pendingTours.length > 0) {
        const pending = pendingTours[0];
        const remainingMs = new Date(pending.loading_end_time) - new Date();
        const loadingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('🕓 LKW wird noch beladen')
              .setDescription(
                `Dein LKW wird aktuell mit der Fracht **${pending.freight || 'Unbekannt'}** beladen.\n\n` +
                `Verbleibende Ladezeit: **${loadingMinutes} Minuten**\n\n` +
                `Bitte warte einen Moment oder versuche es später erneut mit \`/lkw drive\`.`
              )
              .setColor(0xd98226)
              .setImage('https://xstrikers.de/discord/images/truck_loading.png')
          ],
          flags: 0
        });
      }

      // Wenn keine laufende oder wartende Tour vorhanden ist
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ Kein aktiver Auftrag')
            .setDescription('Du musst zuerst einen Auftrag auswählen mit \`/lkw start\`, dann deinen LKW beladen mit \`lkw load\` und mit \`/lkw drive\` startest du dann deine Tour.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    // ✅ Tour kann gestartet werden (Berliner Zeit)
    const tour = tours[0];
    
    const now = new Date();
    const end = new Date(now.getTime() + tour.duration_minutes * 60 * 1000);

    const hours = Math.floor(tour.duration_minutes / 60);
    const minutes = tour.duration_minutes % 60;
    const formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    await pool.execute(
      `UPDATE lkw_tours SET status = 'driving', start_time = ?, end_time = ?, loading_start_time = NULL, loading_end_time = NULL WHERE id = ?`,
      [now, end, tour.id]
    );
    
    schedulePoliceChecks(userId, tour.duration_minutes, interaction);

    const tourDescriptions = [
      `Die Ladung ist verstaut, der Diesel brummt – dein LKW rollt auf die Autobahn. Halte dein Ziel im Blick und meistere die Strecke mit voller Konzentration.`,
      `Der Himmel ist klar, die Straßen frei – dein Truck gleitet mühelos dahin. Die Route ist lang, aber dein Fahrersitz fühlt sich wie ein zweites Zuhause an.`,
      `Der Mond beleuchtet die Straße vor dir. Dein Motor summt ruhig durch die Dunkelheit. Ein echter Profi kennt keine Uhrzeit – nur den Weg zum Ziel.`,
      `Der Motor heult auf, die Gänge sind eingelegt, ab jetzt zählt jede Minute. Die Lieferung wartet – du bist der Boss auf der Straße.`,
      `Die Playlist läuft, dein Truck summt, du bist bereit. Mach es dir bequem, dein Abenteuer beginnen jetzt.`
    ];

    // Zufällig eine Beschreibung auswählen
    const selectedDescription = tourDescriptions[Math.floor(Math.random() * tourDescriptions.length)];

    const arrivalTime = end.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Berlin'
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚛 Tour gestartet')
          .setDescription(
            `**Start ➜ Ziel**\n${tour.start_city} ➜ ${tour.end_city}\n\n` +
            `**Fracht:** ${tour.freight || 'Unbekannt'}\n**Ankunftszeit:** ${arrivalTime} Uhr\n\n` +
            `${selectedDescription}\n\n` +
            `**Viel Erfolg und eine sichere Reise, ${displayName}.**`
          )
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/truck_drive.png')
      ]
    });
  }
};
