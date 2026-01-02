import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub
        .setName('fines')
        .setDescription('Bezahle deinen Strafzettel mit einem Code')
        .addStringOption(option =>
          option.setName('code')
            .setDescription('Gib den Code deines Strafzettels ein')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const code = interaction.options.getString('code');
    const userId = interaction.user.id;

    try {
      // Prüfen, ob der Strafzettel mit diesem Code existiert und ob er dem User gehört
      const [rows] = await db.execute(
        `SELECT * FROM lkw_fines WHERE discord_id = ? AND code = ? AND paid = false`,
        [userId, code]
      );

      if (rows.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Unbekannter Code')
              .setDescription('Dieser Code ist entweder ungültig oder du hast diesen Strafzettel bereits bezahlt.')
              .setColor(0xd92626)
          ],
          flags: 64
        });
      }

      const fine = rows[0];
      const amount = fine.amount;

      // Überprüfen, ob der User genug TruckMiles hat
      const [userRows] = await db.execute(
        `SELECT truckmiles FROM lkw_users WHERE discord_id = ?`,
        [userId]
      );

      const userTruckMiles = userRows[0].truckmiles;

      if (userTruckMiles < amount) {
        const missingAmount = amount - userTruckMiles;
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Nicht genügend TruckMiles')
              .setDescription(`Du hast nicht genügend TruckMiles, um diesen Strafzettel zu bezahlen. Dir fehlen noch **${missingAmount.toLocaleString()}** <:truckmiles:1388239050963681362>`)
              .setColor(0xd92626)
          ],
          flags: 64
        });
      }

      // Abbuchen der TruckMiles
      await db.execute(
        `UPDATE lkw_users SET truckmiles = truckmiles - ? WHERE discord_id = ?`,
        [amount, userId]
      );

      // Strafzettel als bezahlt markieren und aus der Datenbank entfernen
      await db.execute(
        `DELETE FROM lkw_fines WHERE id = ?`,
        [fine.id]
      );

      // Bestätigung der Zahlung
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Strafzettel bezahlt')
            .setDescription(
              `Du hast deinen Strafzettel **${fine.reason}** für **${amount.toLocaleString()}** <:truckmiles:1388239050963681362> bezahlt.\n\n` +
              `Bitte fahre vorsichtig und fair auf den Straßen!`
            )
            .setColor(0x26d926)
            .setImage('https://xstrikers.de/discord/images/police_clean.png')
        ],
        flags: 0
      });
    } catch (error) {
      console.error('❌ Fehler beim Bezahlen des Strafzettels:', error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler')
            .setDescription('Es gab einen Fehler beim Bezahlen deines Strafzettels. Bitte versuche es später erneut.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }
  }
};

