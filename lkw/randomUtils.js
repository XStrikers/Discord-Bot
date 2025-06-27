import { cities } from './cities.js';
import { freightTypes } from './freightTypes.js';

/* Gibt eine zufällige Stadt zurück. */
export function getRandomCity() {
  const index = Math.floor(Math.random() * cities.length);
  return cities[index];
}

/* Gibt zwei verschiedene zufällige Städte zurück (Start & Ziel). */
export function getRandomCityPair() {
  let startCity = getRandomCity();
  let endCity;

  do {
    endCity = getRandomCity();
  } while (endCity === startCity);

  return { startCity, endCity };
}

/* Gibt einen zufälligen Frachttyp zurück. */
export function getRandomFreightType() {
  const index = Math.floor(Math.random() * freightTypes.length);
  return freightTypes[index];
}

/* Gibt true zurück, wenn das Zufallsereignis mit der gegebenen Wahrscheinlichkeit eintritt.
 * @param {number} chance - Zahl zwischen 0.0 und 1.0 */
export function rollChance(chance) {
  return Math.random() < chance;
}

/* Gibt einen Zufallswert innerhalb eines Bereichs zurück. */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
