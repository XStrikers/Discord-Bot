import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import tuningConfig, { getUpgradeCost } from './tuningConfig.js';

// Baut die Fortschrittsanzeige aus ■ und □
function buildProgressBar(currentLevel, maxLevel = 10) {
  const filled = '■'.repeat(currentLevel);
  const empty = '□'.repeat(maxLevel - currentLevel);
  return filled + empty;
}

 // Gibt eine kurze Beschreibung der aktuellen Tuning-Auswirkung
function formatTuningSummary(speedLevel, trailerLevel, ecoLevel, tankLevel) {
  const summary = {};
  const toPercent = (value) => {
    const percent = value * 100;
    const abs = Math.abs(percent);
    const rounded = Math.round(abs);
    return (value >= 0 ? `+${rounded}%` : `-${rounded}%`);
  };

  const s = tuningConfig.speed;
  summary['Geschwindigkeit'] =
    `Fahrtzeit ${toPercent(s.durationMultiplier * speedLevel)}\n` +
    `Tank-Verbrauch ${toPercent(s.fuelMultiplier * speedLevel)}\n` +
    `Risiko ${toPercent(s.riskMultiplier * speedLevel)}`;

  const t = tuningConfig.trailer;
  summary['Anhänger'] =
    `XP ${toPercent(t.xpMultiplier * trailerLevel)}\n` +
    `TruckMiles ${toPercent(t.truckmilesMultiplier * trailerLevel)}`;

  const e = tuningConfig.eco;
  summary['Economy'] =
    `Tank-Verbrauch ${toPercent(e.fuelMultiplier * ecoLevel)}\n` +
    `Risiko ${toPercent(e.riskMultiplier * ecoLevel)}`;

  const k = tuningConfig.tank;
  summary['Tank'] =
    `Tank-Volumen ${toPercent(k.tankMultiplier * tankLevel)}\n` +
    `XP ${toPercent((k.xpMultiplier || 0) * tankLevel)}\n` +
    `TruckMiles ${toPercent((k.truckmilesMultiplier || 0) * tankLevel)}\n` +
    `Fahrtzeit ${toPercent((k.durationMultiplier || 0) * tankLevel)}`;

  return summary;
}

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub => sub
      .setName('tuning')
      .setDescription('Besuche die Werkstatt und sieh dir dein Tuning an.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // 🚫 Check: Hat der User einen aktiven Auftrag?
    const [active] = await db.execute(
      `SELECT id FROM lkw_tours WHERE discord_id = ? AND status IN ('accept', 'loading', 'ready_to_drive', 'driving') LIMIT 1`,
      [userId]
    );

    if (active.length > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🛑 Werkstatt nicht verfügbar')
            .setDescription('Du hast aktuell einen aktiven Auftrag. Bitte beende diesen zuerst, bevor du die Werkstatt besuchst.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    // 🔧 Aktives Fahrzeug laden
    const [truckRows] = await db.execute(
      `SELECT speed_level, trailer_level, eco_level, tank_level FROM lkw_trucks WHERE discord_id = ? AND active = 1 LIMIT 1`,
      [userId]
    );

    if (truckRows.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Kein aktiver LKW')
            .setDescription('Du musst zuerst einen LKW besitzen und aktivieren, bevor du diesen tunen kannst.\n\nBitte gebe \`lkw begin\`ein, damit du deine LKW-Karriere beginnen und im späteren Verlauf deinen LKW tunen kannst.')
            .setColor(0xd92626)
        ],
        flags: 64
      });
    }

    const displayName = interaction.member?.displayName || interaction.user.username;

    const tuning = truckRows[0];
    const summary = formatTuningSummary(
      tuning.speed_level,
      tuning.trailer_level,
      tuning.eco_level,
      tuning.tank_level
    );

    // Werte laden
    const { speed_level, trailer_level, eco_level, tank_level } = tuning;

    // Berechne oder ersetze Kostenanzeige je nach maxLevel
    const costSpeed = speed_level >= tuningConfig.speed.maxLevel
      ? '🔒Maximales Level erreicht'
      : `**Ksten:** ${getUpgradeCost('speed', speed_level).toLocaleString('de-DE')} <:truckmiles:1388239050963681362>`;

    const costTrailer = trailer_level >= tuningConfig.trailer.maxLevel
      ? '🔒 Maximales Level erreicht'
      : `**Kosten:** ${getUpgradeCost('trailer', trailer_level).toLocaleString('de-DE')} <:truckmiles:1388239050963681362>`;

    const costEco = eco_level >= tuningConfig.eco.maxLevel
      ? '🔒 Maximales Level erreicht'
      : `**Kosten:** ${getUpgradeCost('eco', eco_level).toLocaleString('de-DE')} <:truckmiles:1388239050963681362>`;

    const costTank = tank_level >= tuningConfig.tank.maxLevel
      ? '🔒 Maximales Level erreicht'
      : `**Kosten:** ${getUpgradeCost('tank', tank_level).toLocaleString('de-DE')} <:truckmiles:1388239050963681362>`;

    // Embed aufbauen
    const embed = new EmbedBuilder()
      .setTitle(`🔧 ${displayName} - willkommen in der Werkstatt.`)
      .setDescription('Hier kannst du deinen **LKW & Anhänger** verbessern. Jedes Upgrade bringt Vorteile – aber manchmal auch Nachteile.')
      .addFields(
        {
          name: '\u200B',
          value: '',
          inline: false
        },
        {
          name: 'Geschwindigkeit',
          value: `${buildProgressBar(tuning.speed_level)}\n${costSpeed}`,
          inline: true
        },
        {
          name: 'Anhänger',
          value: `${buildProgressBar(tuning.trailer_level)}\n${costTrailer}`,
          inline: true
        },
        {
          name: 'Economy',
          value: `${buildProgressBar(tuning.eco_level)}\n${costEco}`,
          inline: true
        },
        {
          name: '\u200B',
          value: '',
          inline: true
        },
        {
          name: 'Tankgröße',
          value: `${buildProgressBar(tuning.tank_level)}\n${costTank}`,
          inline: false
        },
        {
          name: '\u200B',
          value: '\u200B',
          inline: false
        },
      )
      .addFields(
        {
          name: '📊 **Zusammenfassung**',
          value: '\u200B'},
        {
          name: 'Geschwindigkeit',
          value: summary['Geschwindigkeit'],
          inline: true
        },
        {
          name: 'Anhänger',
          value: summary['Anhänger'],
          inline: true
        },
        {
          name: 'Economy',
          value: summary['Economy'],
          inline: true
        },
        {
          name: '\u200B',
          value: '',
          inline: true
        },
        {
          name: 'Tank',
          value: summary['Tank'],
          inline: false
        },
        {
          name: '\u200B',
          value: '\u200B',
          inline: false
        },
        {
          name: '📋 Hinweis',
          value:
            '\nNutze `/lkw tune` und entscheide dich zwischen **speed**, **trailer**, **economy** oder **tank**, um ein Upgrade durchzuführen.\n' +
            'Wenn du nicht genügend <:truckmiles:1388239050963681362> hast, verdiene mehr durch Touren!',
          inline: false
        }
      )
      .setColor(0x26d926)
      .setImage('https://xstrikers.de/discord/images/truck_tuning.png');

    return interaction.reply({
      embeds: [embed],
      flags: 0
    });
  }
};

