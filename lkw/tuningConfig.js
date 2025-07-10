const tuningConfig = {
  speed: {
    displayName: "Geschwindigkeit",
    maxLevel: 10,
    baseCost: 500,
    costMultiplier: 1.5,
    fuelMultiplier: 0.05,
    riskMultiplier: 0.01,
    durationMultiplier: -0.15,
    description: "Reduziert die Fahrtzeit."
  },

  trailer: {
    displayName: "Anhänger",
    maxLevel: 10,
    baseCost: 400,
    costMultiplier: 1.4,
    xpMultiplier: 0.05,
    truckmilesMultiplier: 0.05,
    description: "Erhöht die Ladekapazität des LKWs."
  },

  eco: {
    displayName: "Umweltfreundlichkeit",
    maxLevel: 10,
    baseCost: 300,
    costMultiplier: 1.3,
    fuelMultiplier: -0.05,
    riskMultiplier: -0.05,
    description: "Reduziert Kraftstoffverbrauch und Unfallwahrscheinlichkeit."
  },

  tank: {
    displayName: "Tankgröße",
    maxLevel: 10,
    baseCost: 600,
    costMultiplier: 1.6,
    tankMultiplier: 0.05,
    xpMultiplier: 0.05,
    truckmilesMultiplier: 0.05,
    durationMultiplier: -0.15,
    description: "Erhöht die Tankkapazität, sodass längere Strecken gefahren werden können."
  }
};

/**
 * Berechnet die Kosten für ein Upgrade zur nächsten Stufe.
 * @param {string} type - Tuningtyp (speed, trailer, eco, tank)
 * @param {number} currentLevel - Aktuelle Stufe (1-10)
 * @returns {number} Kosten in TruckMiles für das nächste Upgrade
 */
export function getUpgradeCost(type, currentLevel) {
  const config = tuningConfig[type];
  if (!config) throw new Error(`Tuning-Typ '${type}' nicht gefunden.`);
  if (currentLevel >= config.maxLevel) return 0;

  const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
  return cost;
}

export default tuningConfig;
