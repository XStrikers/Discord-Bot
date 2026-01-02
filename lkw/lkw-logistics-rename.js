import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub.setName('logistics-rename')
        .setDescription('Deine eigene Logistik.')
        .addStringOption(opt =>
          opt.setName('new-name')
            .setDescription('Benenne deine Logistik neu um.')
            .setRequired(true)
        )),

  async execute(interaction) {
    const userId = interaction.user.id;
    const newName = interaction.options.getString('new-name');

    // Überprüfen, ob der Benutzer eine Logistik hat
    const [logistics] = await db.execute(
      `SELECT * FROM lkw_logistics WHERE discord_id = ?`,
      [userId]
    );

    if (logistics.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Keine Logistik gefunden')
            .setDescription('Du hast noch keine Logistik gegründet und kannst sie daher nicht umbenennen. Bitte gründe zuerst eine Logistik mit \`/lkw logistics-create name:\`, bevor du den Namen änderst.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // Überprüfen, ob der Benutzer genügend TruckMiles hat (z. B. 10.000)
    const [userRows] = await db.execute(`SELECT truckmiles FROM lkw_users WHERE discord_id = ?`, [userId]);
    const userTruckMiles = userRows[0].truckmiles;

    if (userTruckMiles < 10000) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht genug TruckMiles')
            .setDescription('Du benötigst mindestens 10.000 <:truckmiles:1388239050963681362>, um deine Logistik umzubenennen.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    try {
      // Logistik umbenennen
      await db.execute(`UPDATE lkw_logistics SET logistic = ? WHERE discord_id = ?`, [newName, userId]);

      // TruckMiles abziehen
      await db.execute(`UPDATE lkw_users SET truckmiles = truckmiles - 10000 WHERE discord_id = ?`, [userId]);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🏢 Logistik umbenannt')
            .setDescription(`Deine Logistik hat nun einen frischen Anstrich bekommen und ab sofort firmierst du unter dem stolzen Namen **${newName}**.\n\nEin neuer Name, ein neues Kapitel und vielleicht auch ein neues Image? Ob du damit alte Rivalen abschütteln oder einfach nur frischen Wind in deine Flotte bringen willst. Wir wünschen dir auf jeden Fall viel Erfolg auf deinem weiteren Weg durch die virtuelle Transportwelt.`)
            .setColor(0x26d926)
            .setImage('https://xstrikers.de/discord/images/logistics.png')
        ],
        flags: 0
      });
    } catch (error) {
      console.error('❌ Fehler beim Umbenennen der Logistik:', error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler')
            .setDescription('Es gab einen Fehler beim Umbenennen deiner Logistik. Bitte versuche es später erneut.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }
  }
};

