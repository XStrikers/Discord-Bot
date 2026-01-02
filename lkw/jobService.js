import { getRandomCityPair, getRandomFreightType, getRandomInt } from './randomUtils.js';
import { db } from '../economy.js';

const BASE_DURATION_MIN = 30;
const BASE_DURATION_MAX = 120;

// Generiert einen einzelnen zufälligen Auftrag
function generateRandomJob() {
  const { startCity, endCity } = getRandomCityPair();
  const freight = getRandomFreightType();

  let durationMinutes = getRandomInt(BASE_DURATION_MIN, BASE_DURATION_MAX);
  const applyMultiplier = Math.random() < 0.5;

  if (applyMultiplier) {
    durationMinutes = Math.floor(durationMinutes * freight.durationMultiplier);
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const xp = Math.floor(freight.baseXp * (durationMinutes / 60));
  const truckMiles = Math.floor(freight.baseMiles * (durationMinutes / 60));

  return {
    freightName: freight.name,
    startCity,
    endCity,
    duration: durationStr,
    durationMinutes,
    xp,
    truckMiles,
    risk: freight.risk,
    usedMultiplier: applyMultiplier
  };
}

// Generiert zwei zufällige Jobs und speichert sie in der lkw_tours_cache
export async function generateAndStoreJobs(userId) {
  const jobs = [generateRandomJob(), generateRandomJob()];

  await db.execute(`DELETE FROM lkw_tours_cache WHERE discord_id = ?`, [userId]);

  for (const job of jobs) {
    await db.execute(`
      INSERT INTO lkw_tours_cache 
      (discord_id, freight, start_city, end_city, duration_minutes, xp, truckmiles, multiplier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      job.freightName,
      job.startCity,
      job.endCity,
      job.durationMinutes,
      job.xp,
      job.truckMiles,
      job.usedMultiplier
    ]);
  }

  return jobs;
}
