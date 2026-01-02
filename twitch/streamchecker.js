import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveStatus, upsertLiveStatus } from './livestatus.db.js';
import { logToFile } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const streamersPath = path.join(__dirname, 'streamers.json');

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

    const streamers = JSON.parse(fs.readFileSync(streamersPath, 'utf-8'));
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

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🔴 ${isLive.user_name} ist jetzt LIVE!`)
            .setURL(`https://twitch.tv/${streamer}`)
            .setDescription(title)
            .addFields(
                { name: '🎮 Spiel', value: isLive.game_name || 'Unbekannt', inline: true },
                { name: '👥 Zuschauer', value: viewers.toString(), inline: true }
            )
            .setThumbnail(profileImage)
            .setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${streamer}-640x360.jpg`)
            .setFooter({ text: 'Twitch Live' });

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
                viewers
            });

            logToFile('streams.log', `🔴 ${streamer} LIVE (neu gepostet)`);
        }

        /* 🔁 UPDATE */
        else if (
            previous.title !== title ||
            previous.viewers !== viewers
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
            await upsertLiveStatus({
                streamer,
                isLive: false,
                announced: false,
                messageId: previous.messageId,
                title: null,
                viewers: 0
            });

            logToFile('streams.log', `📴 ${streamer} offline`);
        }
    }
}
