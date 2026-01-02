import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('police')
        .setDescription('Zeigt deine offenen Strafzettel an.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (subcommand !== 'police') return;

    try {
      // Alle offenen Strafzettel abrufen
      const [rows] = await db.execute(
        `SELECT * FROM lkw_fines WHERE discord_id = ? AND paid = false ORDER BY issued_at DESC LIMIT 10`,
        [userId]
      );

      // Keine vorhanden?
      if (rows.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('👮 Keine offenen Strafzettel')
              .setDescription('Du hast aktuell keine Strafzettel.\nFahre weiterhin sauber und bleib fair auf den Straßen.')
              .setColor(0x26d926)
              .setImage('https://xstrikers.de/discord/images/police_clean.png')
          ],
          flags: 64
        });
      }

      // Embeds für jeden Strafzettel
      const embeds = rows.map(row =>
        new EmbedBuilder()
          .setTitle(`🚨 Strafzettel CODE: ${row.code}`)
          .setDescription(
            `**Grund der Strafe:** ${row.reason}\n` +
            `**Höhe des Bußgeldes:** ${row.amount.toLocaleString()} <:truckmiles:1388239050963681362>\n\n` +
            `Erstellt am ${new Date(row.issued_at).toLocaleString('de-DE')}`
          )
          .setColor(0xd92626)
          .setImage('https://xstrikers.de/discord/images/police_fine.png')
      );

      // Antworte mit allen Embeds als ephemeral
      await interaction.reply({
        embeds,
        flags: 64
      });

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Strafzettel:', error);
      return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Fehler beim Abrufen der Strafzettel')
              .setDescription('Es ist ein Fehler beim Laden deiner Strafzettel aufgetreten.')
              .setColor(0xd92626)
          ],
          flags: 64
      });
    }
  }
};

