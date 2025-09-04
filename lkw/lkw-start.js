import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { generateAndStoreJobs } from './jobService.js';
import { calculateModifiedJob } from './tuningHelper.js';
import { pool } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand.setName('start')
        .setDescription('Starte deine LKW-Karriere mit einem Auftrag.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    try {
      const userId = interaction.user.id;
      const displayName = interaction.member?.displayName || interaction.user.username;

      // 🧾 Benutzerprüfung
      const [users] = await pool.execute(`SELECT id FROM lkw_users WHERE discord_id = ?`, [userId]);
      if (users.length === 0) {
        const notRegistered = new EmbedBuilder()
          .setTitle(`<:ets2:1379062821924507721> Nicht eingestellt`)
          .setDescription(`Du bist noch nicht bei uns eingestellt.\nBitte führe zuerst \`/lkw begin\` aus, um deine Karriere zu starten.`)
          .setColor(0xd92626)
          .setImage('https://xstrikers.de/discord/images/truck_fail.png');

        return await interaction.editReply({ embeds: [notRegistered] });
      }

      // 🕵️ Aktive Tour prüfen
      const [latestTourRows] = await pool.execute(
        `SELECT * 
         FROM lkw_tours 
         WHERE discord_id = ? 
           AND driver_name IS NULL 
           AND status IN ('accept', 'loading', 'ready_to_drive', 'driving') 
         ORDER BY id DESC 
         LIMIT 1`,
        [userId]
      );

      if (latestTourRows.length > 0) {
        const tour = latestTourRows[0];
        const color = 0xd92626;
        let statusTitle = '';
        let statusMessage = '';
        let image = '';

        switch (tour.status) {
          case 'accept':
            statusTitle = '📋 Bereits angenommener Auftrag';
            statusMessage = `Du hast bereits einen Auftrag angenommen, aber dein LKW wurde noch nicht beladen.\nNutze \`/lkw load\`, um mit der Beladung zu beginnen.`;
            image = 'https://xstrikers.de/discord/images/truck_start.png';
            break;
          case 'loading':
            statusTitle = '📦 Beladung läuft';
            statusMessage = `Dein LKW wird gerade mit der Fracht **${tour.freight || 'Unbekannt'}** beladen.\nNutze \`/lkw drive\`, sobald er fertig ist.`;
            image = 'https://xstrikers.de/discord/images/truck_load.png';
            break;
          case 'ready_to_drive':
            statusTitle = '🚦 Bereit zur Abfahrt';
            statusMessage = `Dein LKW ist beladen.\nStarte mit \`/lkw drive\`.`;
            image = 'https://xstrikers.de/discord/images/truck_load.png';
            break;
          case 'driving':
            statusTitle = '🚛 Bereits unterwegs';
            statusMessage = `Dein LKW fährt von **${tour.start_city}** nach **${tour.end_city}** mit der Fracht **${tour.freight || 'Unbekannt'}**.\nPrüfe mit \`/lkw status\`.`;
            image = 'https://xstrikers.de/discord/images/truck_drive.png';
            break;
        }

        const statusEmbed = new EmbedBuilder()
          .setTitle(statusTitle)
          .setDescription(statusMessage)
          .setColor(color)
          .setImage(image);

        return await interaction.editReply({ embeds: [statusEmbed] });
      }

      const [cached] = await pool.execute(
        `SELECT id FROM lkw_tours_cache WHERE discord_id = ? LIMIT 1`,
        [userId]
      );
      if (cached.length > 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Bereits Frachtangebote ausstehend')
              .setDescription(
                'Du hast dir bereits zwei Frachtaufträge anzeigen lassen.\n' +
                'Bitte wähle zuerst einen davon aus, bevor du `/lkw start` erneut benutzt.'
              )
              .setColor(0xd92626)
          ],
          components: [],
          flags: 64
        });
      }

      // ✅ Keine aktive Tour → Neue Aufträge generieren
      const [tuningRows] = await pool.execute(
        `SELECT speed_level, eco_level, trailer_level, tank_level FROM lkw_trucks WHERE discord_id = ? AND active = 1 LIMIT 1`,
        [userId]
      );

      const tuning = {
        speed_level: tuningRows[0]?.speed_level || 0,
        eco_level: tuningRows[0]?.eco_level || 0,
        trailer_level: tuningRows[0]?.trailer_level || 0,
        tank_level: tuningRows[0]?.tank_level || 0
      };
      
      const jobs = await generateAndStoreJobs(userId);
      const [job1, job2] = jobs;

      // ⛏ richtige Dauer verwenden (in Minuten!)
      const [job1Duration, job1Xp, job1Miles] = calculateModifiedJob(tuning, job1.durationMinutes, job1.xp, job1.truckMiles);
      const [job2Duration, job2Xp, job2Miles] = calculateModifiedJob(tuning, job2.durationMinutes, job2.xp, job2.truckMiles);

      const embed = new EmbedBuilder()
        .setTitle('📋 Wähle deinen nächsten Auftrag')
        .setDescription(
          `Hier sind zwei aktuelle Frachtangebote für dich. Entscheide dich für einen Auftrag:` +
          `\n\n` +
          `📦 **1. ${job1.freightName}**\n\n` +
          `**Start ➜ Ziel**\n${job1.startCity} ➜ ${job1.endCity}\n\n` +
          `**Fahrtzeit:** ${job1Duration} Minuten\n\n` +
          `**Erfahrung & TruckMiles**\n${job1Xp.toLocaleString()} XP´s & ${job1Miles.toLocaleString()} <:truckmiles:1388239050963681362>\n\n\n\n` +
          `📦 **2. ${job2.freightName}**\n\n` +
          `**Start ➜ Ziel**\n${job2.startCity} ➜ ${job2.endCity}\n\n` +
          `**Fahrtzeit:** ${job2Duration} Minuten\n\n` +
          `**Erfahrung & TruckMiles**\n${job2Xp.toLocaleString()} XP´s & ${job2Miles.toLocaleString()} <:truckmiles:1388239050963681362>`
        )
        .setColor(0x26d926)
        .setImage('https://xstrikers.de/discord/images/clipboards.png');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('select_job_1')
          .setLabel('📋 Auftrag 1 annehmen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('select_job_2')
          .setLabel('📋 Auftrag 2 annehmen')
          .setStyle(ButtonStyle.Primary)
      );

      return await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (error) {
      console.error('❌ Fehler im /lkw start Befehl:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Fehler')
        .setDescription('Ein unerwarteter Fehler ist aufgetreten.\nBitte versuche es erneut oder melde den Vorfall einem Admin.')
        .setColor(0xd92626)
        .setImage('https://xstrikers.de/discord/images/error_truck.png');

      return await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

