import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Löscht Nachrichten im Channel (mit optionalem User/Anzahl/All).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    .addUserOption(option =>
      option.setName('user')
        .setDescription('Nur Nachrichten dieses Benutzers löschen')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('anzahl')
        .setDescription('Anzahl der Nachrichten (zwischen 10 und 50)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('all')
        .setDescription('Alle Nachrichten löschen (max. 100, max. 14 Tage alt)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('anzahl');
    const isAll = interaction.options.getBoolean('all') || false;

    const channel = interaction.channel;
    await interaction.deferReply({ flags: 64 });

    const fetchMessages = async () => {
      return (await channel.messages.fetch({ limit: 100 }))
        .filter(msg => (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);
    };

    const replyEmbed = (title, description, color = 0x26d926) =>
      new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);

    try {
      const messages = await fetchMessages();

      let toDelete;

      if (isAll) {
        const filtered = user ? messages.filter(msg => msg.author.id === user.id) : messages;
        toDelete = filtered;
      } else if (amount) {
        if (amount < 10 || amount > 50) {
          return interaction.editReply({
            embeds: [replyEmbed('⚠️ Ungültige Anzahl', 'Bitte gib eine Anzahl zwischen **10 und 50** an.', 0xff0000)]
          });
        }

        const filtered = user
          ? messages.filter(msg => msg.author.id === user.id).first(amount)
          : messages.first(amount);

        toDelete = filtered;
      } else {
        return interaction.editReply({
          embeds: [replyEmbed('ℹ️ Hinweis', 'Bitte gib entweder `anzahl` (10–50) oder `all:true` an.', 0xffc107)]
        });
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      const targetLabel = user ? `von **${user.tag}** ` : '';
      return interaction.editReply({
        embeds: [replyEmbed('🧹 Nachrichten gelöscht', `**${deleted.size}** Nachricht(en) ${targetLabel}wurden gelöscht.`)]
      });

    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      return interaction.editReply({
        embeds: [replyEmbed('❌ Fehler', 'Beim Löschen der Nachrichten ist ein Fehler aufgetreten.', 0xff0000)]
      });
    }
  }
};
