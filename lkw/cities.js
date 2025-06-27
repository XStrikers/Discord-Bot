const cities = [
  "Berlin", "Hamburg", "München", "Köln", "Frankfurt", "Stuttgart",
  "Dresden", "Leipzig", "Düsseldorf", "Nürnberg", "Hannover", "Bremen",
  "Essen", "Dortmund", "Mainz", "Augsburg", "Regensburg", "Kiel",
  "Freiburg", "Wiesbaden", "Rostock", "Erfurt", "Saarbrücken", "Magdeburg"
];

function getRandomCity(exclude = []) {
  const available = cities.filter(city => !exclude.includes(city));
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

export { cities, getRandomCity };
