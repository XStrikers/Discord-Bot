import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub.setName('logistics-create')
        .setDescription('Erstelle deine eigene Logistik mit einem Namen.')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Nur Buchstaben und 1x Leerzeichen.')
            .setRequired(true)
        )),

  async execute(interaction) {
    const userId = interaction.user.id;
    let name = interaction.options.getString('name');

    // Überprüfe, ob der Name null oder leer ist
    if (!name || name.trim().length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Ungültiger Name')
            .setDescription('Der Name der Logistik darf nicht leer sein.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // Entferne führende und nachfolgende Leerzeichen
    name = name.trim();

    // Überprüfe, ob der Benutzer genug TruckMiles hat
    const [userRows] = await db.execute(`SELECT truckmiles FROM lkw_users WHERE discord_id = ?`, [userId]);
    const userTruckMiles = userRows[0].truckmiles;

    if (userTruckMiles < 5000) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht genug TruckMiles')
            .setDescription('Du hast nicht genügend <:truckmiles:1388239050963681362>, um eine Logistik zu gründen. Du benötigst mindestens 5.000 <:truckmiles:1388239050963681362>.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // Überprüfe, ob der Name mehr als ein Leerzeichen enthält und keine Zahlen oder Sonderzeichen
    const spaceCount = (name.match(/\s/g) || []).length;
    const regex = /^[A-Za-z\s]+$/;

    if (spaceCount > 1) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Ungültiger Name')
            .setDescription('Der Name deiner Logistik darf nur **ein einziges Leerzeichen** enthalten. Mehrere Leerzeichen sind nicht erlaubt.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    if (!regex.test(name)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Ungültiger Name')
            .setDescription('Der Name darf nur aus **Buchstaben und genau einem Leerzeichen** bestehen. Zahlen und Sonderzeichen sind nicht erlaubt!')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    // Logistik erstellen
    await db.execute(`INSERT INTO lkw_logistics (discord_id, logistic) VALUES (?, ?)`, [userId, name]);

    // Benutzer aktualisieren (5k TruckMiles abziehen)
    await db.execute(`UPDATE lkw_users SET truckmiles = truckmiles - 5000 WHERE discord_id = ?`, [userId]);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏢 Logistik gegründet')
          .setDescription(`Herzlichen Glückwunsch zur erfolgreichen Gründung deiner eigenen **${name}** Logistik.\n\nMit Stolz und röhrenden Motoren begrüßen wir Dich offiziell auf unseren digitalen Straßen – möge euer Fuhrpark wachsen, die Aufträge rollen, eure Trucks niemals im Stau stehen und keine Strafzettel geflogen kommen.\n\nEine weitere starke Konkurrenz ist hiermit am Start, die den etablierten Spediteuren das Dieselherz höher schlagen lässt. Doch aufgepasst, in dieser Branche wird nicht geblinkt – hier wird durchgezogen!\n\nIn diesem Sinne seid Willkommen im Kreis der Könige der Logistiken.\nAuf viele erfolgreiche Touren, unvergessliche Pannen und natürlich mit viel Spaß.`)
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/logistics.png')
      ],
      flags: 0
    });
  }
};

