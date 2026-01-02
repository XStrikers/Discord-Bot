import { db } from '../economy.js';
import { userJobs } from './jobMemory.js';

async function handleLkwButtons(interaction) {
  await interaction.deferReply({ flags: 64 });

  const userId = interaction.user.id;
  const selectedJobIndex = parseInt(interaction.customId.split('_').pop(), 10) - 1;

  const jobs = userJobs.get(userId);
  if (!jobs || !jobs[selectedJobIndex]) {
    await interaction.editReply({
      content: '❌ Der gewählte Auftrag ist ungültig oder abgelaufen.'
    });
    return;
  }

  const job = jobs[selectedJobIndex];

  const now = new Date();
  const end = new Date(now.getTime() + job.durationMinutes * 60 * 1000);

  try {
    await db.execute(
      `INSERT INTO lkw_tours 
        (discord_id, truck_id, start_city, end_city, freight, duration_minutes, start_time, end_time, status, earned_xp, earned_truckmiles, accident, traffic_jam, fine_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        null,
        job.startCity,
        job.endCity,
        job.freightName,
        job.durationMinutes,
        now,
        end,
        'in_progress',
        job.xp,
        job.truckMiles,
        false,
        false,
        false
      ]
    );

    await interaction.editReply({
      content: `✅ Auftrag **${job.freightName}** von **${job.startCity} ➜ ${job.endCity}** angenommen!\nDauer: **${job.duration}**\nDu kannst den Fortschritt später mit \`/lkw status\` überprüfen.`
    });

    userJobs.delete(userId);

  } catch (error) {
    console.error('❌ Fehler beim Speichern des Auftrags:', error);
    await interaction.editReply({
      content: 'Beim Starten deines Auftrags ist ein Fehler aufgetreten. Bitte versuche es erneut.'
    });
  }
}

export default handleLkwButtons;

