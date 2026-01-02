import { db } from '../economy.js';

export async function updateLoadingStatus(userId) {
  const [rows] = await db.execute(
    `SELECT status, loading_start_time 
     FROM lkw_tours 
     WHERE discord_id = ? 
     ORDER BY id DESC 
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) return;

  const tour = rows[0];

  if (tour.status !== 'loading' || !tour.loading_start_time) return;

  const loadingStart = new Date(tour.loading_start_time);
  const now = new Date();

  const elapsedMs = now - loadingStart;

  if (elapsedMs >= 5 * 60 * 1000) {
    // 5 Minuten überschritten → auf ready_to_drive updaten
    await db.execute(
      `UPDATE lkw_tours SET status = 'ready_to_drive' 
       WHERE discord_id = ? AND status = 'loading'`,
      [userId]
    );
  }
}

