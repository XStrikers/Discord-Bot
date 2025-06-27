// lkw\`/lkw-help.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zeigt alle lkw-Befehle und ihre Beschreibungen an'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 LKW-Minigame Hilfe')
      .setColor(0xd98226)
      .setDescription('Hier findest du alle verfügbaren \`/lkw\`-Befehle und ihre Funktionen:')
      .addFields(
        { name: '\n',                                             value: '\u200B' },
        { name: '\`/lkw agentur\`',                               value: 'Stelle einen neuen Fahrer für deine Logistik ein' },
        { name: '\`/lkw begin\`',                                 value: 'Erstelle dir dein Fahrerprofil' },
        { name: '\`/lkw buy\`',                                   value: 'Kaufe einen neuen LKW für deine Logistik' },
        { name: '\`/lkw da-buy\`',                                value: 'Erwerbe neue Fahrer für deine Logistik' },
        { name: '\`/lkw complete\`',                              value: 'Schließe deinen aktuellen Auftrag ab' },
        { name: '\`/lkw drive\`',                                 value: 'Starte deine Tour, sobald der LKW beladen ist' },
        { name: '\`/lkw driver-tour lkw:<Nr>\`',                  value: 'Schicke deinen Angestellten mit LKW_<Nr> auf Tour' },
        { name: '\`/lkw drivers-and-trucks\`',                    value: 'Zeigt deine verfügbaren Fahrer und inaktiven LKWs' },
        { name: '\`/lkw fines code:<Code>\`',                     value: 'Be­zahle deine Strafzettel mit einem Code' },
        { name: '\`/lkw load\`',                                  value: 'Belade deinen LKW' },
        { name: '\`/lkw logistics\`',                             value: 'Zeigt alle verfügbaren Logistik-Befehle' },
        { name: '\`/lkw logistics-create\`',                      value: 'Erstelle deine eigene Logistik' },
        { name: '\`/lkw logistics-rename\`',                      value: 'Benenne deine Logistik um' },
        { name: '\`/lkw logistics-stats\`',                       value: 'Zeigt die Statistiken deiner Logistik' },
        { name: '\`/lkw merge driver:<Name> truck:<Name>\`',      value: 'Weise einen Fahrer einem LKW zu' },
        { name: '\`/lkw police\`',                                value: 'Zeigt deine offenen Strafzettel' },
        { name: '\`/lkw profile\`',                               value: 'Zeigt dein persönliches Fahrerprofil' },
        { name: '\`/lkw shop\`',                                  value: 'Besuche den LKW-Shop' },
        { name: '\`/lkw start\`',                                 value: 'Starte deine LKW-Karriere mit einem Auftrag' },
        { name: '\`/lkw status\`',                                value: 'Zeigt dir den aktuellen Status deines Auftrags' },
        { name: '\`/lkw tuning\`',                                value: 'Besuche die Werkstatt und sieh dein Tuning an' },
        { name: '\`/lkw tune bereich:<Speed|Trailer|Eco|Tank>\`', value: 'Upgrade deinen LKW in einem Bereich' }
      )
      .setFooter({ text: 'Viel Erfolg und stets gute Fahrt 🚚' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
