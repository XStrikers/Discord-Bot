import 'dotenv/config';
import tuningConfig, { getUpgradeCost } from './tuningConfig.js';

/**
 * Lädt das aktuelle Tuning eines Users aus der DB.
 * @param {string} discordId
 * @returns {Promise<Object>} Tuning-Stufen { speed, trailer, eco, tank }
 */
export async function getUserTuning(discordId) {
  const rows = await query(
    `SELECT speed, trailer, eco, tank FROM user_tuning WHERE discord_id = ?`,
    [discordId]
  );
  if (rows.length === 0) {
    // Falls noch kein Eintrag, Standardwerte zurückgeben (Level 0)
    return {
      speed: 0,
      trailer: 0,
      eco: 0,
      tank: 0
    };
  }
  return rows[0];
}

/**
 * Prüft, ob ein Upgrade möglich ist.
 * @param {string} type - Tuningtyp
 * @param {number} currentLevel
 * @param {number} userTruckMiles
 * @returns {{ canUpgrade: boolean, reason?: string }}
 */
export function canUpgrade(type, currentLevel, userTruckMiles) {
  if (!tuningConfig[type]) {
    return { canUpgrade: false, reason: 'Ungültiger Tuning-Typ.' };
  }
  if (currentLevel >= tuningConfig[type].maxLevel) {
    return { canUpgrade: false, reason: 'maxLevelReached' };
  }
  const cost = getUpgradeCost(type, currentLevel);
  if (userTruckMiles < cost) {
    return { canUpgrade: false, reason: 'notEnoughTruckMiles' };
  }
  return { canUpgrade: true };
}

/**
 * Führt das Upgrade durch, wenn möglich, und aktualisiert DB.
 * @param {string} discordId
 * @param {string} type - Tuningtyp
 * @param {number} currentLevel
 * @param {number} userTruckMiles
 * @returns {Promise<{ success: boolean, message: string, newLevel?: number, cost?: number }>}
 */
export async function upgradeTuning(discordId, type, currentLevel, userTruckMiles) {
  const check = canUpgrade(type, currentLevel, userTruckMiles);

  if (!check.canUpgrade) {
    let msg = '';
    if (check.reason === 'maxLevelReached') {
      msg = 'denn du hast das maximale Level erreicht.';
    } else if (check.reason === 'notEnoughTruckMiles') {
      msg = 'denn du hast nicht genügend TruckMiles.';
    } else {
      msg = `Upgrade nicht möglich, ${check.reason}`;
    }

    return {
      success: false,
      message: msg
    };
  }

  const cost = getUpgradeCost(type, currentLevel);
  const newLevel = currentLevel + 1;

  // DB-Update: Tuning-Level erhöhen oder neuen Datensatz anlegen
  const existing = await query(
    `SELECT discord_id FROM user_tuning WHERE discord_id = ?`,
    [discordId]
  );

  if (existing.length === 0) {
    // Eintrag anlegen
    await query(
      `INSERT INTO user_tuning (discord_id, speed, trailer, eco, tank) VALUES (?, ?, ?, ?, ?)`,
      [
        discordId,
        type === 'speed' ? newLevel : 0,
        type === 'trailer' ? newLevel : 0,
        type === 'eco' ? newLevel : 0,
        type === 'tank' ? newLevel : 0
      ]
    );
  } else {
    // Update bestehender Datensatz
    await query(
      `UPDATE user_tuning SET ?? = ? WHERE discord_id = ?`,
      [type, newLevel, discordId]
    );
  }

  // TruckMiles abziehen im User-Profil
  await query(
    `UPDATE user_profiles SET truckmiles = truckmiles - ? WHERE discord_id = ?`,
    [cost, discordId]
  );

  return {
    success: true,
    message: `Upgrade auf Stufe ${newLevel} erfolgreich! Das Upgrade hat dir ${cost} TruckMiles gekostet.`,
    newLevel,
    cost
  };
}
