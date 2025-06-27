/**
 * Wandelt Minuten in hh:mm Format um.
 * @param {number} minutes
 * @returns {string} z.B. "02:45"
 */
export function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Wandelt Sekunden in mm:ss Format um.
 * @param {number} seconds
 * @returns {string} z.B. "05:30"
 */
export function secondsToMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Berechnet das Enddatum (ETA) basierend auf Startzeit und Minuten Dauer.
 * @param {Date} startDate
 * @param {number} durationMinutes
 * @returns {Date}
 */
export function calculateETA(startDate, durationMinutes) {
  return new Date(startDate.getTime() + durationMinutes * 60000);
}

/**
 * Prüft, ob die angegebene Endzeit bereits vergangen ist.
 * @param {Date} endDate
 * @returns {boolean}
 */
export function isTimeOver(endDate) {
  return new Date() >= endDate;
}

/**
 * Gibt die verbleibende Zeit in Minuten und Sekunden zurück.
 * @param {Date} endDate
 * @returns {{minutes: number, seconds: number}} verbleibende Zeit
 */
export function getTimeRemaining(endDate) {
  const now = new Date();
  let diff = Math.max(0, endDate.getTime() - now.getTime()); // Differenz in ms, niemals negativ
  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return { minutes, seconds };
}
