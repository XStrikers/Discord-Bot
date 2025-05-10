import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveStatusFromGitHub, updateLiveStatusOnGitHub } from './livestatusmanager.js';
import { logToFile } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let accessToken = '';
const streamersPath = path.join(__dirname, 'streamers.json');

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
    logToFile('streams.log', '✅ Streamcheck gestartet');

    if (!accessToken) {
        accessToken = await getAccessToken();
    }

    let streamers = [];
    try {
        const streamersRaw = fs.readFileSync(streamersPath, 'utf-8');
        streamers = JSON.parse(streamersRaw);
    } catch (err) {
        console.error("❌ Fehler beim Lesen der streamers.json:", err);
        logToFile('errors.log', `❌ Fehler beim Lesen der streamers.json: ${err.message}`);
    }

    const { status: liveStatus } = await getLiveStatusFromGitHub();
    const userQuery = streamers.map(s => `user_login=${s}`).join('&');

    const res = await fetch(`https://api.twitch.tv/helix/streams?${userQuery}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (res.status === 401) {
        console.warn('⚠️ Access Token ungültig – wird erneuert...');
        logToFile('errors.log', `⚠️ Twitch API 401 – Access Token wurde erneuert`);

        accessToken = await getAccessToken();
        return await checkTwitchStreams(client);
    }

    const data = await res.json();
    const liveNow = data.data;
    const channel = await client.channels.fetch(process.env.TWITCH_CHANNEL_ID);

    for (const streamer of streamers) {
        const isLive = liveNow.find(s => s.user_login.toLowerCase() === streamer.toLowerCase());

        if (isLive) {
            const userInfoRes = await fetch(`https://api.twitch.tv/helix/users?login=${isLive.user_login}`, {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const userInfoData = await userInfoRes.json();
            const user = userInfoData.data[0];
            const profileImage = user.profile_image_url;
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            const title = isLive.title;
            const viewers = isLive.viewer_count;
            const cacheBuster = Math.floor(now.getTime() / (10 * 60 * 1000));
            const thumbnail = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${isLive.user_login}-640x360.jpg?cb=${cacheBuster}`;

            const startedAt = new Date(isLive.started_at);
            const diffMs = now - startedAt;
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffMin = Math.floor((diffMs % 3600000) / 60000);
            const streamUptime = `${diffHrs > 0 ? `${diffHrs}h ` : ''}${diffMin}min`;



            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`🔴 ${isLive.user_name} ist jetzt LIVE!`)
                .setURL(`https://twitch.tv/${isLive.user_login}`)
                .setDescription(`${title}\n\u200B`)
                .addFields(
                    { name: '🎮 Spiel', value: `${isLive.game_name || 'Unbekannt'}`, inline: true },
                    { name: '👥 Zuschauer', value: `${viewers.toLocaleString('de-DE')}`, inline: true },
                    { name: '🕒 Laufzeit', value: streamUptime, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false },
                    { name: '🔗 Link', value: `https://twitch.tv/${isLive.user_login}`, inline: false }
                )
                .setThumbnail(profileImage)
                .setImage(thumbnail)
                .setFooter({
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/5968/5968819.png',
                    text: `Twitch - ${formattedTime} Uhr`
                });

            const previous = liveStatus[streamer];

            // Wenn noch nie gepostet → sende neue Nachricht
            if (!previous?.announced || !previous?.messageId) {
                logToFile('streams.log', `🔴 ${isLive.user_login} ist live – ${viewers} Zuschauer – "${title}"`);
                const sent = await channel.send({ content: '||@everyone||', embeds: [embed] });

                liveStatus[streamer] = {
                    isLive: true,
                    announced: true,
                    messageId: sent.id,
                    title,
                    viewers,
                    thumbnail,
                    cacheBuster
                };
            } else {
                // Prüfe auf Änderungen
                const hasChanges =
                    previous.title !== title ||
                    previous.viewers !== viewers ||
                    previous.thumbnail !== thumbnail ||
                    previous.cacheBuster !== cacheBuster;

                if (hasChanges) {
                    try {
                        const msg = await channel.messages.fetch(previous.messageId);
                        await msg.edit({ embeds: [embed] });

                        liveStatus[streamer] = {
                            ...liveStatus[streamer],
                            title,
                            viewers,
                            thumbnail
                        };
                        console.log(`🔁 Beitrag von ${streamer} aktualisiert.`);
                        logToFile('streams.log', `🔁 ${streamer} aktualisiert – "${title}" (${viewers} Zuschauer)`);

                    } catch (err) {
                        console.warn(`⚠️ Nachricht von ${streamer} konnte nicht bearbeitet werden:`, err);
                        logToFile('errors.log', `❌ Nachricht von ${streamer} konnte nicht bearbeitet werden: ${err.message}`);
                    }
                }
            }
        }
    }

    // Alle Streamer durchgehen, um Offline-Zustände zu erkennen
    for (const streamer of streamers) {
        const wasLive = liveStatus[streamer]?.isLive;
        const stillLive = liveNow.some(s => s.user_login.toLowerCase() === streamer.toLowerCase());

    // Wenn er vorher live war, aber jetzt nicht mehr → als offline markieren
        if (wasLive && !stillLive) {
            console.log(`📴 ${streamer} ist jetzt offline.`);

            liveStatus[streamer] = {
                isLive: false,
                announced: false
            };
        }
    }

    for (const streamer of Object.keys(liveStatus)) {
        const wasLive = liveStatus[streamer]?.isLive;
        const isCurrentlyLive = liveNow.some(s => s.user_login.toLowerCase() === streamer.toLowerCase());

        if (wasLive && !isCurrentlyLive) {
            logToFile('streams.log', `📴 ${streamer} ist offline`);

            liveStatus[streamer] = {
                isLive: false,
                announced: false
            };
        }
    }

      await updateLiveStatusOnGitHub(liveStatus);
}
