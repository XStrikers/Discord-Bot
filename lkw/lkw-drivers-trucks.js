import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Zeigt alle verfügbaren Fahrer und inaktive LKWs an.')
    .addSubcommand(sub =>
      sub.setName('drivers-and-trucks')
        .setDescription('Zeigt eine Liste von Fahrern und inaktiven LKWs an, die einem Fahrer zugewiesen werden können.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Verwende deferReply, um Discord mitzuteilen, dass die Antwort länger dauert
    await interaction.deferReply();

    // Abrufen der verfügbaren Fahrer, die keinem LKW zugewiesen sind
    const [drivers] = await db.execute(
      `SELECT driver_name FROM lkw_driver_truck_assignment WHERE (truck_name IS NULL OR truck_name = '') AND discord_id = ?`,
      [userId]
    );

    // Überprüfen, ob Fahrer vorhanden sind
    if (drivers.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Nicht zur Verfügung')
            .setDescription(`Es gibt keine verfügbaren Fahrer, die keinem LKW zugewiesen sind`)
            .setColor(0xd92626)
        ],
      });
      return;
    }

    // Abrufen der inaktiven LKWs (active = 0)
    const [inactiveTrucks] = await db.execute(
      `SELECT name FROM lkw_trucks WHERE active = 0 AND discord_id = ?`,
      [userId]
    );

    // Überprüfen, ob inaktive LKWs vorhanden sind
    if (inactiveTrucks.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Kein LKW vorhanden')
            .setDescription(`Es gibt keine inaktiven LKWs, die keinem Fahrer zugewiesen sind.`)
            .setColor(0xd92626)
        ],
      });
      return;
    }

    // Erstellen der Listen für Fahrer und LKWs als Text
    const driverList = drivers.map(driver => `${driver.driver_name}`).join('\n');
    const truckList = inactiveTrucks.map(truck => `${truck.name}`).join('\n');

    // Erstelle das Embed mit den Listen
    const embed = new EmbedBuilder()
      .setTitle('🚚 Fahrer & LKW Liste')
      .setDescription(
        'Es werden alle Fahrer und LKWs aufgelistet, die aktuell noch nicht zugewiesen wurden und somit zur Verfügung stehen.\n' +
        'Du kannst deinen Angestellten einen LKW zuweisen durch folgenden Befehl:\n\n\`/lkw merge driver: truck:\`'
      )
      .setColor(0x26d926)
      .setImage('https://xstrikers.de/discord/images/truck_start.png')
      .addFields(
        {
          name: '\u200B',
          value: '\n',
          inline: false,
        },
        {
          name: '**Verfügbare Fahrer**',
          value: driverList || 'Aktuell hast du keine freien Angestellte.',
          inline: true,
        },
        {
          name: '**Aktueller Fuhrpark**',
          value: truckList || 'Es stehen keine LKW´s im Fuhrpark.',
          inline: true, 
        }
      );

    await interaction.editReply({
      embeds: [embed],
    });
  }
};

