import fs from 'fs/promises';
import path from 'path';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const holidaysPath = path.join(__dirname, '../events/holidays.json');

function formatGermanDate(isoDateString) {
  const date = new Date(isoDateString);
  if (isNaN(date)) return isoDateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('holidays')
    .setDescription('Zeigt eine Liste der Feiertage mit Datum.'),
    .setDefaultMemberPermissions(0)

  async execute(interaction) {
  const ownerId = process.env.OWNER_ID;

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: '🚫 Du darfst diesen Befehl nicht verwenden.',
      flags: 64
    });
  }
    
    try {
      const fileContent = await fs.readFile(holidaysPath, 'utf-8');
      const holidaysData = JSON.parse(fileContent);
      const entries = Object.values(holidaysData);

      if (!entries.length) {
        return interaction.reply({
          content: '⚠️ Keine Feiertage gefunden!',
          flags: 0
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 Feiertage')
        .setColor('#e8b27c')
        .setTimestamp();


      const fields = [];

      // Gruppiere immer zwei Einträge nebeneinander
      for (let i = 0; i < entries.length; i += 2) {
        const left = entries[i];
        const right = entries[i + 1];

        // Linke Spalte
        fields.push({
          name: `🎉 ${left.event}`,
          value: `Von ${formatGermanDate(left.date_start)}\nBis ${formatGermanDate(left.date_end)}`,
          inline: true
        });

        // Rechte Spalte, falls vorhanden
        if (right) {
          fields.push({
            name: `🎉 ${right.event}`,
            value: `Von ${formatGermanDate(right.date_start)}\nBis ${formatGermanDate(right.date_end)}`,
            inline: true
          });
        } else {
          // Falls kein rechter Partner vorhanden ist, fülle die Lücke für symmetrisches Layout
          fields.push({
            name: '\u200B',
            value: '\u200B',
            inline: true
          });
        }

        // Leere Zeile nach jeder Reihe für Abstand
        fields.push({
          name: '\u200B',
          value: '\u2003',
          inline: false
        });
      }

      embed.addFields(fields);

      return interaction.reply({
        embeds: [embed],
        flags: 0
      });
    } catch (error) {
      console.error('❌ Fehler beim Lesen der holidays.json:', error);
      return interaction.reply({
        content: '❌ Fehler beim Laden der Feiertagsdaten.',
        flags: 64
      });
    }
  }
};
