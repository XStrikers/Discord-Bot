import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(sub =>
      sub.setName('logistics')
        .setDescription('Zeigt alle verfügbaren Logistikbefehle')),

  async execute(interaction) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏢 Logistik Befehle')
          .setDescription('Hier sind alle verfügbaren Logistikbefehle:\n\n' +
                           '**/lkw logistics-create name:** - Gründe deine Logistik.\n' +
                           '**/lkw logistics-rename new-name:** - Benenne Deine Logistik um.\n' +
                           '**/lkw logistics-stats** - Zeigt die Statistiken Deiner Logistik.\n' +
                           '**/lkw agentur** - Zeigt dir an, was der neue Angestellte kostet.\n' +
                           '**/lkw db-buy** - Erwerbe dir einen neuen Fahrer für deine Logistik.\n' +
                           '**/lkw shop** - Lass dir in einem LKW Shop den Kaufpreis für einen LKW anzeigen.\n' +
                           '**/lkw buy** - Erwerbe dir einen neuen LKW für deinen Angestellten.\n' +
                           '**/lkw drivers-and-trucks** - Zeige alle nicht zugewiesene Angestellte und LKW´s.\n' +
                           '**/lkw merge** - Teile deinen Angestellten einem LKW zu, um weitere Aufträge gleichzeitig auszuführen.\n' +
                           '**/lkw driver-tour** - Schicke einen bestimmten LKW auf Tour.'
                          )
          .setColor(0xd98226)
          .setImage('https://xstrikers.de/discord/images/logistics_stats.png')
      ],
      flags: 0
    });
  }
};
