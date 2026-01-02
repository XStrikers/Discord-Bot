import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../economy.js';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsPath = path.join(__dirname, '..', 'assets');

export default {
  data: new SlashCommandBuilder()
    .setName('lkw')
    .setDescription('LKW Logistik Befehle')
    .addSubcommand(subcommand =>
      subcommand
        .setName('profile')
        .setDescription('Zeigt dein persönliches Fahrerprofil an.')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // 🧾 Benutzer prüfen
    const [rows] = await db.execute(`SELECT * FROM lkw_users WHERE discord_id = ? LIMIT 1`, [userId]);

    if (rows.length === 0) {
      // ❗ Nur diese Nachricht ist privat
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('👥 Kein Fahrerprofil')
            .setDescription('Wir konnten leider kein aktives Fahrerprofil finden.\nStarte deine Karriere als LKW-Fahrer mit dem Befehl \`/lkw begin\` und sichere dir deinen ersten Truck sowie Zugang zum Auftragsnetzwerk.')
            .setColor(0xd92626)
            .setImage('https://xstrikers.de/discord/images/truck_fail.png')
        ],
        flags: 64
      });
    }

    await interaction.deferReply(); // Restliche Antwort ist öffentlich

    const user = rows[0];
    const displayName = interaction.member?.displayName || interaction.user.username;

    // 📷 Bilder laden
    const background = await loadImage(path.join(assetsPath, 'truck_profile.png'));
    const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatarImage = await loadImage(avatarURL);

    const width = 750;
    const height = 330;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 🎨 Hintergrund
    ctx.drawImage(background, 0, 0, width, height);

    // 🧍 Avatar-Kreis
    ctx.save();
    ctx.beginPath();
    ctx.arc(85, 85, 60, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, 25, 25, 120, 120);
    ctx.restore();

    // 🔴 Avatar-Rahmen
    ctx.beginPath();
    ctx.arc(85, 85, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#d92626';
    ctx.lineWidth = 5;
    ctx.stroke();

    // 🏅 Rangbezeichnung
    let rankName = "Anwärter";
    if (user.level >= 10) rankName = "Straßenpilot";
    if (user.level >= 20) rankName = "Transport-Spezialist";
    if (user.level >= 30) rankName = "Konvoi-Meister";
    if (user.level >= 40) rankName = "Highway-Legende";
    if (user.level >= 50) rankName = "Goldhauler";
    if (user.level >= 60) rankName = "Lastesel";
    if (user.level >= 70) rankName = "Speedtrucker";
    if (user.level >= 80) rankName = "Logistiker";

    // 👤 Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.fillText(`${displayName}`, 180, 60);

    // 📈 Level & Rang
    ctx.font = '24px Arial';
    ctx.fillStyle = '#d92626';
    ctx.fillText(`Level ${user.level} - ${rankName}`, 180, 95);

    // 🔢 XP
    const xpText = `${user.current_xp.toLocaleString('de-DE')} / ${user.needed_xp.toLocaleString('de-DE')} XP`;
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(xpText, 180, 155);

    // 📊 XP-Balken
    const xpPercent = user.current_xp / user.needed_xp;
    const barWidth = 500;
    const barHeight = 20;
    const xBar = 180;
    const yBar = 170;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(xBar, yBar, barWidth, barHeight);
    ctx.fillStyle = '#d92626';
    ctx.fillRect(xBar, yBar, barWidth * xpPercent, barHeight);

    // 🚚 Touren
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Gefahrene Touren: ${user.total_tours}`, 180, 250);

    // 🛣️ TruckMiles mit Emoji
    ctx.font = '24px Arial';
    const truckMilesText = `TruckMiles: ${user.truckmiles.toLocaleString('de-DE')}`;
    ctx.fillText(truckMilesText, 180, 280);

    // 📦 Emoji darstellen
    const emojiImage = await loadImage('https://cdn.discordapp.com/emojis/1379087323400110120.png');
    const emojiSize = 24;
    const emojiX = 180 + ctx.measureText(truckMilesText).width + 10;
    const emojiY = 280 - emojiSize + 5;
    ctx.drawImage(emojiImage, emojiX, emojiY, emojiSize, emojiSize);

    // 🏆 Rang #X
    const [rankedUsers] = await db.execute(
      `SELECT discord_id FROM lkw_users ORDER BY level DESC, current_xp DESC`
    );
    const rankIndex = rankedUsers.findIndex(u => u.discord_id === user.discord_id);
    const rank = rankIndex >= 0 ? rankIndex + 1 : '—';

    ctx.font = 'bold 44px Arial';
    const rankText = `#${rank}`;
    const textWidth = ctx.measureText(rankText).width;
    ctx.fillStyle = '#d92626';
    ctx.fillText(rankText, width - textWidth - 30, height - 50);

    // 📤 Canvas senden
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'truck_profile.png' });

    return interaction.editReply({ files: [attachment] });
  }
};

