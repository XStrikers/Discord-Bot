import { db } from '../economy.js';
import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveStatus, upsertLiveStatus } from './livestatus.db.js';
import { logToFile } from './logger.js';


function getEuropeanDateTime() {
    return new Date().toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

let accessToken = '';

async function getAccessToken() {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });

    const data = await res.json();
    return data.access_token;
}

export async function checkTwitchStreams(client) {
    logToFile('streams.log', '📡 Twitch Streamcheck gestartet');

    if (!accessToken) {
        accessToken = await getAccessToken();
    }

    const [rows] = await db.query(
        'SELECT streamer FROM twitch_livestatus'
    );

    if (!rows.length) return;
    
    const streamers = rows.map(r => r.streamer);
    const userQuery = streamers.map(s => `user_login=${s}`).join('&');

    const res = await fetch(`https://api.twitch.tv/helix/streams?${userQuery}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (res.status === 401) {
        accessToken = await getAccessToken();
        return checkTwitchStreams(client);
    }

    const data = await res.json();
    const liveNow = data.data || [];
    const channel = await client.channels.fetch(process.env.TWITCH_CHANNEL_ID);

    /* =========================
       🔴 LIVE / UPDATE
       ========================= */
    for (const streamer of streamers) {
        const isLive = liveNow.find(
            s => s.user_login.toLowerCase() === streamer.toLowerCase()
        );

        const previous = await getLiveStatus(streamer);

        if (!isLive) continue;

        const title = isLive.title;
        const viewers = isLive.viewer_count;
        const game = isLive.game_name;

        const userRes = await fetch(
            `https://api.twitch.tv/helix/users?login=${streamer}`,
            {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const user = (await userRes.json()).data[0];
        const profileImage = user.profile_image_url;
        const now = new Date();
        const startedAt = new Date(isLive.started_at);
        
        const diffMs = now - startedAt;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMin = Math.floor((diffMs % 3600000) / 60000);
        
        const streamUptime =
            `${diffHrs > 0 ? `${diffHrs}h ` : ''}${diffMin}min`;

        const cacheBuster = Math.floor(Date.now() / (10 * 60 * 1000));

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🔴 ${isLive.user_name} ist jetzt LIVE!`)
            .setURL(`https://twitch.tv/${streamer}`)
            .setDescription(`${title}\n\u200B`)
            .addFields(
                { name: '🎮 Spiel', value: isLive.game_name || 'Unbekannt', inline: true },
                { name: '👥 Zuschauer', value: viewers.toLocaleString('de-DE'), inline: true },
                { name: '🕒 Laufzeit', value: streamUptime, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '🔗 Link', value: `https://twitch.tv/${streamer}`, inline: false }
            )
            .setThumbnail(profileImage)
            .setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamer}-640x360.jpg?cb=${cacheBuster}`)
            .setFooter({
                iconURL: 'https://cdn-icons-png.flaticon.com/512/5968/5968819.png',
                text: `Twitch Live - ${getEuropeanDateTime()}`
            });

        /* 🆕 ERSTER POST */
        if (!previous || !previous.announced || !previous.messageId) {
            const sent = await channel.send({
                content: '||@everyone||',
                embeds: [embed]
            });

            await upsertLiveStatus({
                streamer,
                isLive: true,
                announced: true,
                messageId: sent.id,
                title,
                game,
                viewers
            });

            logToFile('streams.log', `🔴 ${streamer} LIVE (neu gepostet)`);
        }

        /* 🔁 UPDATE */
        else if (
            previous.title !== title ||
            previous.viewers !== viewers ||
            previous.game !== isLive.game_name
        ) {
            try {
                const msg = await channel.messages.fetch(previous.messageId);
                await msg.edit({ embeds: [embed] });

                await upsertLiveStatus({
                    streamer,
                    isLive: true,
                    announced: true,
                    messageId: previous.messageId,
                    title,
                    game: isLive.game_name,
                    viewers
                });

                logToFile('streams.log', `🔁 ${streamer} aktualisiert`);
            } catch (err) {
                logToFile('errors.log', `❌ Edit fehlgeschlagen (${streamer})`);
            }
        }
    }

    /* =========================
    📴 OFFLINE
    ========================= */
    for (const streamer of streamers) {
        const stillLive = liveNow.some(
            s => s.user_login.toLowerCase() === streamer.toLowerCase()
        );

        const previous = await getLiveStatus(streamer);

        if (previous?.isLive && !stillLive) {
            try {
                let msg = null;

                if (previous.messageId) {
                    try {
                        msg = await channel.messages.fetch(previous.messageId);
                    } catch (err) {
                        logToFile('errors.log', `⚠️ Alte Live-Nachricht nicht gefunden (${streamer})`);
                    }
                }

                const offlineEmbed = new EmbedBuilder()
                    .setColor('#4b4b4b')
                    .setTitle(`⚫ ${streamer} ist jetzt offline`)
                    .setDescription('Der Stream ist beendet.\n\u200B')
                    .setImage('https://static-cdn.jtvnw.net/ttv-static/404_preview-640x360.jpg')
                    .setFooter({
                        iconURL: 'https://cdn-icons-png.flaticon.com/512/5968/5968819.png',
                        text: 'Twitch – Offline'
                    });

                if (msg) {
                    await msg.edit({ embeds: [offlineEmbed] });
                }

                await upsertLiveStatus({
                    streamer,
                    isLive: false,
                    announced: false,
                    messageId: null,
                    title: null,
                    game: null,
                    viewers: 0
                });

                logToFile('streams.log', `📴 ${streamer} offline gesetzt`);
            } catch (err) {
                logToFile('errors.log', `❌ Offline-Update fehlgeschlagen (${streamer}): ${err.message}`);
            }
        }
    }
}
