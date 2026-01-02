import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('load')
        .setDescription('Belade deinen LKW für den nächsten Auftrag.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Aktiven Auftrag finden
    const [tours] = await db.execute(
      `SELECT id FROM lkw_tours WHERE discord_id = ? AND status = 'accept' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    if (tours.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ Kein Auftrag zum Beladen')
            .setDescription('Du musst zuerst einen Auftrag auswählen mit `/lkw start`, damit du deinen LKW beladen kannst.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    const tourId = tours[0].id;

    // Ladezeit generieren (z. B. 5–10 Minuten zufällig)
    const loadingMinutes = Math.floor(Math.random() * 6) + 5; // 5-10 Minuten
    const now = new Date();
    const end = new Date(now.getTime() + loadingMinutes * 60 * 1000);

    // Status aktualisieren
    await db.execute(
      `UPDATE lkw_tours SET status = 'loading', loading_start_time = ?, loading_end_time = ? WHERE id = ?`,
      [now, end, tourId]
    );

    const [jobData] = await db.execute(
      `SELECT freight FROM lkw_tours WHERE id = ? LIMIT 1`,
      [tourId]
    );

    const freightName = jobData.length > 0 ? jobData[0].freight : 'unbekannten Ladung';

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📦 LKW wird beladen')
          .setDescription(
            `Dein LKW wird jetzt mit der **${freightName}** beladen.\n` +
            `Für das Beladen deines LKW´s werden **${loadingMinutes} Minuten** benötigt.\n\n` +
            `Sobald der Vorgang abgeschlossen ist, kannst du mit \`/lkw drive\` die Fahrt starten.`
          )
          .setColor(0xd98226)
          .setImage('https://xstrikers.de/discord/images/truck_load.png')
      ]
    });
  }
};

