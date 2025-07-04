const freightTypes = [
  {
    name: "Allgemeine Fracht",
    baseXp: 10,
    baseMiles: 25,
    risk: 0.01,
    durationMultiplier: 1.0
  },
  {
    name: "Tiefkühlfracht",
    baseXp: 15,
    baseMiles: 40,
    risk: 0.03,
    durationMultiplier: 1.3
  },
  {
    name: "Schwertransport",
    baseXp: 25,
    baseMiles: 60,
    risk: 0.05,
    durationMultiplier: 2.5
  },
  {
    name: "Flüssiggüter",
    baseXp: 18,
    baseMiles: 42,
    risk: 0.04,
    durationMultiplier: 1.5
  },
  {
    name: "Baustoffe",
    baseXp: 12,
    baseMiles: 38,
    risk: 0.02,
    durationMultiplier: 1.0
  },
  {
    name: "Gefahrengut (ADR)",
    baseXp: 30,
    baseMiles: 70,
    risk: 0.07,
    durationMultiplier: 2.5
  },
  {
    name: "Landwirtschaftliche Fracht",
    baseXp: 14,
    baseMiles: 36,
    risk: 0.02,
    durationMultiplier: 1.0
  },
  {
    name: "Containerfracht",
    baseXp: 20,
    baseMiles: 45,
    risk: 0.03,
    durationMultiplier: 1.0
  },
  {
    name: "Fahrzeugtransport",
    baseXp: 22,
    baseMiles: 48,
    risk: 0.04,
    durationMultiplier: 1.2
  },
  {
    name: "Spezialtransport",
    baseXp: 35,
    baseMiles: 80,
    risk: 0.08,
    durationMultiplier: 5.0
  }
];


function getRandomFreightType() {
  const index = Math.floor(Math.random() * freightTypes.length);
  return freightTypes[index];
}

export { freightTypes, getRandomFreightType };
