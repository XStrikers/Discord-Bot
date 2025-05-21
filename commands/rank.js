import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { getAllUserStats, getUserStats } from '../economy.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsPath = path.join(__dirname, '..', 'assets');

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Dein aktueller Rang.'),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user = await getUserStats(userId);

    if (!user) {
      const embed = new EmbedBuilder()
      .setTitle('❌ Kein Profil gefunden')
      .setDescription('Du hast noch kein Profil. Nutze `/daily`, um dein Abenteuer zu starten.')
      .setColor(0xd92626)
      .setImage('https://xstrikers.de/discord/images/levelup.png');

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const allUsers = await getAllUserStats();

    // 🧠 Neue Sortierlogik: level DESC, current_xp DESC
    const sorted = allUsers.sort((a, b) => {
      if (b.level === a.level) {
        return b.current_xp - a.current_xp;
      }
      return b.level - a.level;
    });

    // 🎯 Rang anhand von discord_id ermitteln
    const rankIndex = sorted.findIndex(u => String(u.discord_id) === String(userId));
    const rank = rankIndex === -1 ? 1 : rankIndex + 1;

    // 🖼 Bildauswahl basierend auf Platz
    let bgImagePath;
    if (rank === 1) bgImagePath = 'rank_1.png';
    else if (rank === 2) bgImagePath = 'rank_2.png';
    else if (rank === 3) bgImagePath = 'rank_3.png';
    else bgImagePath = 'na.png';

    const background = await loadImage(path.join(assetsPath, bgImagePath));
    const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(avatarURL);

    const canvasWidth = 750;
    const canvasHeight = 250;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 🎨 Hintergrund
    ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);

    // 🎨 Farbpalette definieren
    let nameColor = '#ffffff';
    let levelColor = '#ffffff';
    let xpColor = '#ffffff';
    let coinsColor = '#ffffff';

    // 💎 Optional: Schatten und Outline-Style je Rang
    let enableShadow = false;
    let strokeStyle = null;

    if (rank === 1) {
        nameColor = '#FFD700';
        levelColor = '#ffbf40';
        xpColor = '#ffd47f';
        coinsColor = '#ffeabf';
        enableShadow = true;
        strokeStyle = '#8B8000';
    } else if (rank === 2) {
        nameColor = '#C0C0C0';
        levelColor = '#d9d9d9';
        xpColor = '#b3b3b3';
        coinsColor = '#999999';
        enableShadow = true;
        strokeStyle = '#808080';
    } else if (rank === 3) {
        nameColor = '#CD7F32';
        levelColor = '#ff9340';
        xpColor = '#ffb580';
        coinsColor = '#ffdabf';
        enableShadow = true;
        strokeStyle = '#8B4513';
    }

    // 🧑 Avatar rund anzeigen
    ctx.save();
    ctx.beginPath();
    ctx.arc(75, 75, 50, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 25, 25, 100, 100);
    ctx.restore();

    // 🖌 Avatar-Rahmen je Rang
    if (rank <= 3) {
        let borderColor = '#ffffff';
  
        if (rank === 1) borderColor = '#ffbf40';
        else if (rank === 2) borderColor = '#d9d9d9';
        else if (rank === 3) borderColor = '#ff9340';
  
        ctx.beginPath();
        ctx.arc(75, 75, 52, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 5;
        ctx.stroke();
    }  

    // 🏷 Anzeigename verwenden (mit Fallback)
    let displayName;
    if (user && user.display_name && user.display_name.trim() !== '') {
        displayName = user.display_name;
    } else {
        displayName = interaction.user.username;
    }

    // ✍️ Anzeigename mit Schatten
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px "Arial", sans-serif';
    ctx.fillText(displayName, 150, 60);

    ctx.shadowColor = 'transparent';

    // 🥇 Rang (rechts unten)
    const rankText = `#${rank}`;
    let rankFontSize = 40;
    let rankFontWeight = 'bold';
    let rankColor = '#ffffff';
    let rankShadow = false;
    
    // 🎖 Einstellungen je Rang
    if (rank === 1) {
      rankColor = '#ffbf40';
      rankShadow = true;
      rankFontSize = 48;
    } else if (rank === 2) {
      rankColor = '#d9d9d9';
      rankShadow = true;
      rankFontSize = 44;
    } else if (rank === 3) {
      rankColor = '#ff9340';
      rankShadow = true;
      rankFontSize = 42;
    }
    
    ctx.font = `${rankFontWeight} ${rankFontSize}px sans-serif`;
    const rankWidth = ctx.measureText(rankText).width;
    
    // ✨ Optional: Schatten aktivieren
    if (rankShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;
    }
    
    ctx.fillStyle = rankColor;
    ctx.fillText(rankText, canvas.width - rankWidth - 30, canvas.height - 30);
    
    // Schatten zurücksetzen
    ctx.shadowColor = 'transparent';
            
    // 📊 Level, XP, Coins anzeigen
    const padding = 80;
    const xStart = 150;
    const yStart = 150;

    ctx.font = '24px sans-serif';

    ctx.fillStyle = levelColor;
    const levelText = `Level ${user.level}`;
    ctx.fillText(levelText, xStart, yStart);
    const levelWidth = ctx.measureText(levelText).width;

    ctx.fillStyle = xpColor;
    const xpText = `${user.current_xp.toLocaleString('de-DE')} / ${user.xp_needed.toLocaleString('de-DE')} XP`;
    ctx.fillText(xpText, xStart + levelWidth + padding, yStart);

    // 💰 Coins-Zeile darunter anzeigen
    ctx.fillStyle = coinsColor;
    const coinsText = `${user.coins.toLocaleString('de-DE')} XS-Coins`;

    // ✨ Neue Y-Position (z. B. +30 Pixel unter der ersten Zeile)
    const coinsY = yStart + 50;

    ctx.fillText(coinsText, xStart, coinsY);
    
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

    await interaction.editReply({
      files: [attachment],
      flags: 0,
    });
  }
};
