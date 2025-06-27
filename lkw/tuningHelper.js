import tuningConfig from './tuningConfig.js';

 // Rundet eine Dezimalzahl mathematisch korrekt (0–4 runter, 5–9 hoch).
function smartRound(value) {
  return Math.round(value);
}

 // Gibt modifizierte Dauer, XP und TruckMiles basierend auf Tuning zurück.
export function calculateModifiedJob(tuning, baseDuration, baseXp, baseTruckMiles) {
  let duration = baseDuration;
  let xp = baseXp;
  let truckMiles = baseTruckMiles;

  console.log('Types:', typeof baseDuration, typeof baseXp, typeof baseTruckMiles);

  // Geschwindigkeit → Fahrtzeit verkürzt, Tank + Risiko erhöht (nicht hier relevant)
  const speedEffect = tuning.speed_level * tuningConfig.speed.durationMultiplier;
  duration = duration + (duration * speedEffect); // speedEffect ist negativ → kürzer

  // Trailer → XP & TruckMiles erhöhen sich
  const trailerXpEffect = tuning.trailer_level * tuningConfig.trailer.xpMultiplier;
  const trailerMilesEffect = tuning.trailer_level * tuningConfig.trailer.truckmilesMultiplier;
  xp = xp + (xp * trailerXpEffect);
  truckMiles = truckMiles + (truckMiles * trailerMilesEffect);

  // Tank → Alles leicht erhöht
  const tankXpEffect = tuning.tank_level * 0.01;           // 1% XP pro Level
  const tankMilesEffect = tuning.tank_level * 0.01;        // 1% TruckMiles pro Level
  const tankDurationEffect = tuning.tank_level * 0.015;    // 1.5% Dauer pro Level

  xp = xp + (xp * tankXpEffect);
  truckMiles = truckMiles + (truckMiles * tankMilesEffect);
  duration = duration + (duration * tankDurationEffect);

  return [
    smartRound(duration),
    smartRound(xp),
    smartRound(truckMiles)
  ];
}
