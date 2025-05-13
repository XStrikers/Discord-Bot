import { Events, EmbedBuilder, MessageFlags } from 'discord.js';
import fs from 'fs/promises';
import { addXPAndCoins } from '../economy.js';

const holidayPath = new URL('../events/holidays.json', import.meta.url);
const logPath = new URL('../events/eventlog.json', import.meta.url);

export default {
  name: Events.MessageCreate,
  async execute(message) {
    console.log(`[DEBUG] Nachricht erkannt: ${message.content}`);

    if (message.author.bot || !message.content.startsWith('!')) return;

    const command = message.content.trim().split(' ')[0].toLowerCase();
    const today = new Date();
    const year = today.getFullYear();

    try {
      const [holidays, logs] = await Promise.all([
        fs.readFile(holidayPath, 'utf8').then(JSON.parse),
        fs.readFile(logPath, 'utf8').then(JSON.parse),
      ]);

      const event = holidays[command];
      if (!event) return;

    // Heutiges Datum als ISO-String (YYYY-MM-DD) – lokal in Europe/Berlin
    const dateformatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const todayStr = dateformatter.format(today);

    if (todayStr < event.date_start || todayStr > event.date_end) {
        const embed = new EmbedBuilder()
          .setTitle('📆 Kein Feiertag')
          .setDescription(`Aktuell liegt kein Feiertag vor, der diesen Befehl erlaubt.`)
          .setColor(0xd92626)
          .setImage('https://xstrikers.de/discord/images/no_holiday.png');
        return message.channel.send({ embeds: [embed], flags: 64 });
    }
    
    const userId = message.author.id;
    const displayName = message.member?.displayName ?? message.author.username;    
    const logKey = `${command}_${year}`;

      // Überprüfen, ob der Benutzer den Befehl bereits ausgeführt hat
      if (logs[logKey]?.some(log => log.user_id === userId)) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Feiertagsbonus')
          .setDescription(`Du hast diesen Feiertagsbonus bereits eingelöst.\nWarte bitte bis zum nächsten Feiertag - vielen Dank <:love:1346851878289412147>`)
          .setColor(0xd98226)
          .setImage('https://xstrikers.de/discord/images/no_holiday.png');
        return message.channel.send({ embeds: [embed] });
      }

      // XP und Coins hinzufügen
      await addXPAndCoins(userId, event.amount, event.amount);

      // Loggen
      if (!logs[logKey]) logs[logKey] = [];

      // Aktuelles Datum und Uhrzeit (Deutsch, z. B. 11. Mai 2025, 14:32)
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Europe/Berlin',
      });
      const formattedDateTime = formatter.format(now);

      // Logobjekt erstellen
      logs[logKey].push({
        user_id: userId,
        username: message.author.username,
        display_name: message.member?.displayName ?? message.author.username,
        date_time: formattedDateTime
      });

      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));

      // Erfolgsnachricht
        const embed = new EmbedBuilder()
          .setTitle(':cherry_blossom: Feiertag')
          .setDescription(`**${displayName}** hat **${event.amount} XP** und **${event.amount} XS-Coins** für den Feiertag **${event.event}** erhalten.`)
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/holidays.png');
        return message.channel.send({ embeds: [embed] });
      
    } catch (err) {
      console.error(err);
      const embed = new EmbedBuilder()
        .setTitle(':x: Fehler')
        .setDescription(`Es gab ein Problem beim Starten deines Abenteuers. Versuche es bitte erneut.`)
        .setColor(0xd92626);

        return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
