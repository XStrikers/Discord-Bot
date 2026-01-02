import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import tuningConfig, { getUpgradeCost } from './tuningConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub
        .setName('tune')
        .setDescription('Verbessere deinen LKW in einem Bereich.')
        .addStringOption(opt =>
          opt.setName('bereich')
            .setDescription('Verpasse deinem LKW und Anhänger ein Upgrade.')
            .setRequired(true)
            .addChoices(
              { name: 'Geschwindigkeit', value: 'speed' },
              { name: 'Anhänger', value: 'trailer' },
              { name: 'Eco (Sprit & Sicherheit)', value: 'eco' },
              { name: 'Tankgröße', value: 'tank' }
            )
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const type = interaction.options.getString('bereich');

    // 1. Aktiver Auftrag blockiert Tuning
    const [tours] = await db.execute(
      `SELECT id FROM lkw_tours WHERE discord_id = ? AND status IN ('accept', 'loading', 'ready_to_drive', 'driving') LIMIT 1`,
      [userId]
    );
    if (tours.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🛑 Werkstatt nicht verfügbar')
            .setDescription('Bitte beende deinen aktiven Auftrag, bevor du die Werkstatt nutzen kannst.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
       flags: 64
      });
    }

    // 2. Aktiven Truck laden
    const [truckRows] = await db.execute(
      `SELECT id, speed_level, trailer_level, eco_level, tank_level FROM lkw_trucks WHERE discord_id = ? AND active = 1 LIMIT 1`,
      [userId]
    );

    if (truckRows.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Kein aktiver Truck gefunden')
            .setDescription('Du musst zuerst einen Truck kaufen und aktivieren, um ihn tunen zu können.')
            .setColor(0xd92626)
        ],
       flags: 64
      });
    }

    const truck = truckRows[0];
    const levelKey = `${type}_level`;
    const currentLevel = truck[levelKey];
    const config = tuningConfig[type];

    if (!config) {
      return interaction.reply({ content: '❌ Ungültiger Tuningbereich.',flags: 64 });
    }

    if (currentLevel >= config.maxLevel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔒 Maximallevel erreicht')
            .setDescription(`Du hast bereits das maximale **Level ${config.maxLevel}** für **${config.displayName}** erreicht.`)
            .setColor(0xd92626)
        ],
       flags: 64
      });
    }

    // 3. TruckMiles prüfen
    const [userRow] = await db.execute(
      `SELECT truckmiles FROM lkw_users WHERE discord_id = ? LIMIT 1`,
      [userId]
    );
    const user = userRow[0];

    const cost = getUpgradeCost(type, currentLevel);

    if (user.truckmiles < cost) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('<:truckmiles:1379087323400110120> Nicht genug TruckMiles')
            .setDescription(`Für dieses Upgrade benötigst du **${cost}** <:truckmiles:1388239050963681362>, du hast aber nur **${user.truckmiles}**.`)
            .setColor(0xd92626)
        ],
       flags: 64
      });
    }

    const newLevel = currentLevel + 1;

    // 4. Truck-Level aktualisieren & TruckMiles abziehen
    await db.execute(
      `UPDATE lkw_trucks SET ${levelKey} = ? WHERE id = ?`,
      [newLevel, truck.id]
    );

    await db.execute(
      `UPDATE lkw_users SET truckmiles = truckmiles - ? WHERE discord_id = ?`,
      [cost, userId]
    );

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`✅ Upgrade erfolgreich`)
          .setDescription(
            `**${config.displayName}** wurde auf Stufe **${newLevel}** verbessert.\n\n` +
            `**Neue Wirkung:** \n${config.description}\n\n` +
            `Nutze \`/lkw tuning\`, um dir deine neuen Werte anzusehen.`
          )
          .setColor(0x26d926)
          .setImage('https://xstrikers.de/discord/images/tune_success.png')
      ],
      flags: 0
    });
  }
};

