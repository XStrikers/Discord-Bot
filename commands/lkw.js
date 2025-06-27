// commands/lkw.js

import { SlashCommandBuilder } from 'discord.js';
import handleBegin from '../lkw/lkw-begin.js';
import handleStart from '../lkw/lkw-start.js';
import handleLoad from '../lkw/lkw-load.js';
import handleDrive from '../lkw/lkw-drive.js';
import handleStatus from '../lkw/lkw-status.js';
import handleComplete from '../lkw/lkw-complete.js';
import handleTuning from '../lkw/lkw-tuning.js';
import handleTune from '../lkw/lkw-tune.js';
import handleProfile from '../lkw/lkw-profile.js';
import handlePolice from '../lkw/lkw-police.js';
import handleFines from '../lkw/lkw-fines.js';
import handleLogistics from '../lkw/lkw-logistics.js';
import handleLogisticsCreate from '../lkw/lkw-logistics-create.js';
import handleLogisticsRename from '../lkw/lkw-logistics-rename.js';
import handleLogisticsStats from '../lkw/lkw-logistics-stats.js';
import handleAgentur from '../lkw/lkw-agentur.js';
import handleAgenturBuy from '../lkw/lkw-agentur-buy.js';
import handleShop from '../lkw/lkw-shop.js';
import handleBuy from '../lkw/lkw-buy.js';
import handleMerge from '../lkw/lkw-merge.js';
import handleDriversTrucks from '../lkw/lkw-drivers-trucks.js';
import handleDriverTour from '../lkw/lkw-driver-start.js';
import handleHelp from '../lkw/lkw-help.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('Erstelle dir ein Fahrerprofil.')
    .addSubcommand(sub =>
      sub.setName('begin').setDescription('Führe deine eigene Logistik.'))
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Suche dir einen Auftrag aus.'))
    .addSubcommand(sub =>
      sub.setName('load').setDescription('Belade deinen LKW.'))
    .addSubcommand(sub =>
      sub.setName('drive').setDescription('Starte die Fahrt.'))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Zeigt den aktuellen Status.'))
    .addSubcommand(sub =>
      sub.setName('complete').setDescription('Schließe deinen aktuellen Auftrag ab und erhalte deine Belohnung.'))
    .addSubcommand(sub =>
      sub.setName('tuning').setDescription('Besuche die Werkstatt und sieh dir dein Tuning an.'))
    .addSubcommand(sub =>
      sub.setName('tune')
        .setDescription('Verpasse deinem LKW und Anhänger ein Upgrade.')
        .addStringOption(opt =>
          opt.setName('bereich')
            .setDescription('Wähle einen Bereich für dein Upgrade.')
            .setRequired(true)
            .addChoices(
              { name: 'Geschwindigkeit', value: 'speed' },
              { name: 'Anhänger', value: 'trailer' },
              { name: 'Economy', value: 'eco' },
              { name: 'Tankgröße', value: 'tank' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('fines')
        .setDescription('Bezahle deinen Strafzettel mit einem Code.')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('Gib den Code deines Strafzettels ein.')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('profile').setDescription('Zeigt dein persönliches Fahrerprofil an.'))
    .addSubcommand(sub =>
      sub.setName('police').setDescription('Zeigt deine offenen Strafzettel an.'))
    .addSubcommand(sub =>
      sub.setName('logistics').setDescription('Zeigt alle verfügbaren Logistik-Befehle.'))
    .addSubcommand(sub =>
      sub.setName('logistics-create')
        .setDescription('Erstelle deine eigene Logistik mit einen Namen.')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Nur Buchstaben und 1x Leerzeichen.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logistics-rename')
        .setDescription('Benenne deine Logstik neu um.')
        .addStringOption(opt =>
          opt.setName('new-name')
            .setDescription('Nur Buchstaben und 1x Leerzeichen.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logistics-stats')
        .setDescription('Zeigt die Statistiken deiner Logistik an.'))
    .addSubcommand(sub =>
      sub.setName('agentur').setDescription('Stelle einen neuen Fahrer für deine Logistik ein.'))
    .addSubcommand(sub =>
      sub.setName('da-buy').setDescription('Kaufe einen neuen Fahrer für deine Logistik.'))
    .addSubcommand(sub =>
      sub.setName('shop').setDescription('Besuche den LKW-Shop.'))
    .addSubcommand(sub =>
      sub.setName('buy').setDescription('Kaufe einen neuen LKW für deine Logistik.'))
    .addSubcommand(sub =>
      sub.setName('merge')
        .setDescription('Weise einem Fahrer einen LKW zu.')
        .addStringOption(option =>
          option.setName('driver')
            .setDescription('Name des Fahrers')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('truck')
            .setDescription('Name des LKWs')
            .setRequired(true)
        ))
    .addSubcommand(sub =>
      sub.setName('drivers-and-trucks')
        .setDescription('Zeigt eine Liste von Fahrern und inaktiven LKWs an, die einem Fahrer zugewiesen werden können.'))
    .addSubcommand(sub =>
      sub
        .setName('driver-tour')
        .setDescription('Startet eine Tour für einen bestimmten LKW oder für alle LKWs.')
        .addIntegerOption(option =>
          option
            .setName('lkw')
            .setDescription('Nummer deines LKWs (z.B. 1 für Truck_1)')
            .setRequired(true)
        ))
    .addSubcommand(sub =>
      sub.setName('help')
        .setDescription('Zeigt alle lkw-Befehle und ihre Beschreibungen an')),


  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'begin':
        return handleBegin.execute(interaction);
      case 'start':
        return handleStart.execute(interaction);
      case 'load':
        return handleLoad.execute(interaction);
      case 'drive':
        return handleDrive.execute(interaction);
      case 'status':
        return handleStatus.execute(interaction);
      case 'complete':
        return handleComplete.execute(interaction);
      case 'tuning':
        return handleTuning.execute(interaction);
      case 'tune':
        return handleTune.execute(interaction);
      case 'profile':
        return handleProfile.execute(interaction);
      case 'police':
        return handlePolice.execute(interaction);
      case 'fines':
        return handleFines.execute(interaction);
      case 'logistics':
        return handleLogistics.execute(interaction);
      case 'logistics-create':
        return handleLogisticsCreate.execute(interaction);
      case 'logistics-rename':
        return handleLogisticsRename.execute(interaction);
      case 'logistics-stats':
        return handleLogisticsStats.execute(interaction);
      case 'agentur':
        return handleAgentur.execute(interaction);
      case 'da-buy':
        return handleAgenturBuy.execute(interaction);
      case 'shop':
        return handleShop.execute(interaction);
      case 'buy':
        return handleBuy.execute(interaction);
      case 'merge':
        return handleMerge.execute(interaction);
      case 'drivers-and-trucks':
        return handleDriversTrucks.execute(interaction);
      case 'driver-tour':
        return handleDriverTour.execute(interaction);
      case 'help':
        return handleHelp.execute(interaction);
      default:
        return interaction.reply({ content: 'Unbekannter Subcommand.', flags: 64 });
    }
  }
};
