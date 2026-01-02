import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import { updateLoadingStatus } from './checkLoadingStatus.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Zeigt dir den aktuellen Status deines LKW-Auftrags.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    await updateLoadingStatus(userId);

    const [rows] = await db.execute(
      `SELECT * FROM lkw_tours WHERE discord_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('⛔ Kein aktiver Auftrag')
        .setDescription('Wenn du bereit bist, dich hinter das Steuer zu setzen... `/lkw start`')
        .setColor(0xd92626)
        .setImage('https://xstrikers.de/discord/images/truck_fail.png');

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    const tour = rows[0];
    const now = new Date();
    let embed = new EmbedBuilder().setTitle('👀 LKW-Auftragsstatus').setColor(0x3498db);
    const displayName = interaction.member?.displayName || interaction.user.username;


    switch (tour.status) {
      case 'accept':
        embed
          .setDescription('Du hast nun deinen Auftrag angenommen und musst deinen LKW beladen lassen. Mit \`/lkw load\` lässt du deinen LKW beladen.')
          .setImage('https://xstrikers.de/discord/images/truck_start.png');
        break;

      case 'loading':
        const loadingEnd = new Date(tour.loading_end_time);
        const remainingMs = loadingEnd - now;

        if (remainingMs > 0) {
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.floor((remainingMs % 60000) / 1000);

          embed
            .setDescription(`📦 **Dein LKW befindet sich aktuell im Ladeprozess**\n\nDie Fracht wird sorgfältig aufgeladen, gesichert und für den bevorstehenden Transport vorbereitet. Stapler fahren geschäftig hin und her, Arbeiter verladen palettenweise Güter – alles läuft nach Plan.\nBitte habe etwas Geduld, denn Qualität und Sicherheit gehen vor. Dein LKW wird in wenigen Minuten vollständig beladen sein und bereit zur Abfahrt.\n\n**Zeit verbleibend: **${minutes}m ${seconds}s`)
            .setImage('https://xstrikers.de/discord/images/truck_load.png');
        } else {
          embed
            .setDescription(`✅ **Beladen abgeschlossen – dein LKW ist startklar**\n\nDie Fracht ist vollständig verladen, gesichert und bereit für den Transport. Dein LKW steht jetzt vollgetankt und beladen auf dem Hof, bereit für die nächste große Tour.\nBitte beachte: **Diese Ansicht wird automatisch aktualisiert**, sobald du zur Weiterfahrt bereit bist.\nStarte deine Tour mit \`/lkw drive\` und bring die Ladung sicher ans Ziel. Gute Fahrt und allzeit eine unfallfreie Strecke.`)
            .setImage('https://xstrikers.de/discord/images/truck_load.png');
        }
        break;

      case 'ready_to_drive':
        embed
          .setDescription(`🚛 **LKW fertig beladen – Abfahrbereit**\n\nDie Ladung ist vollständig verstaut, die Türen wurden versiegelt und alle Sicherheitschecks sind abgeschlossen. Dein LKW steht nun voll beladen auf dem Hof und wartet nur noch auf dein Kommando.\n\nStarte deine Tour mit dem Befehl \`/lkw drive\`\n\nMach dich bereit, die Straße ruft und deine Fracht muss sicher ans Ziel gebracht werden.\n\nAngenehme Fahrt wünschen wir dir, ${displayName}`)
          .setImage('https://xstrikers.de/discord/images/lkw_start.png');
        break;

      case 'driving':
        const endTime = new Date(tour.end_time);
        const driveMs = endTime - now;

        const arrival = new Date(tour.end_time);
        const formattedTime = arrival.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Europe/Berlin'
        });

        if (driveMs > 0) {
          embed
            .setDescription(`🚛 **Dein LKW ist unterwegs zur Zielstadt**\n\nDer Motor brummt, die Straße liegt vor dir und deine Ladung ist gesichert – die Fahrt hat begonnen. Dein LKW rollt aktuell zuverlässig in Richtung Zielstadt und trotzt Wind und Wetter.\n\nBehalte die Straße im Blick und sei bereit für alles, was auf dich zukommt. Schon bald erreichst du deinen Bestimmungsort und kannst deine Lieferung abschließen.\n\n**Ankunft:** ${formattedTime} Uhr\n\n\n**Habe eine angehme weiterfahrt und konzentriere dich auf die Straße.**`)
            .setImage('https://xstrikers.de/discord/images/truck_drive.png');
        } else {
          embed
            .setDescription(`🕒 **Tour fast abgeschlossen**\n\nDein LKW nähert sich dem Zielort – die letzten Kilometer liegen hinter dir, die Stadtgrenze ist bereits in Sicht.\n\nHalte noch einen kurzen Moment durch, die Entladung beginnt in Kürze. Schon bald ist dein Auftrag erfolgreich abgeschlossen und du kannst deine wohlverdiente Belohnung mit \`/lkw complete\` einstreichen.`)
            .setImage('https://xstrikers.de/discord/images/truck_drive2.png');
        }
        break;

      case 'completed':
        embed
          .setDescription(`✅ **Auftrag erfolgreich abgeschlossen**\n\nDu bist sicher an dein Ziel angekommen und die Fracht wurde ordnungsgemäß entladen. \n\nDu hast damit deine Tour erfolgreich beendet und kannst stolz auf deine Leistung sein.\nMach dich bereit für neue Herausforderungen, mit \`/lkw start\` beginnt dein nächstes Abenteuer auf den Straßen.`)
          .setImage('https://xstrikers.de/discord/images/truck_complete.png');
        break;

      default:
        embed
          .setDescription(`❌ **Unbekannter Status in der Datenbank**\n\nEs ist ein unerwarteter Fehler aufgetreten. Der Status deines Auftrags konnte nicht korrekt erkannt werden. \nBitte kontaktiere einen Administrator oder versuche es später erneut.`);
        break;
    }

    return interaction.reply({ embeds: [embed] });
  }
};

