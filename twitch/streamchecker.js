import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveStatusFromGitHub, updateLiveStatusOnGitHub } from './livestatusmanager.js';

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
    if (!accessToken) {
        accessToken = await getAccessToken();
    }

    let streamers = [];
    try {
        const streamersRaw = fs.readFileSync(streamersPath, 'utf-8');
        streamers = JSON.parse(streamersRaw);
    } catch (err) {
        console.error("❌ Fehler beim Lesen der streamers.json:", err);
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
            const thumbnail = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${isLive.user_login}-640x360.jpg`;

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`🔴 ${isLive.user_name} ist jetzt LIVE!`)
                .setURL(`https://twitch.tv/${isLive.user_login}`)
                .setDescription(`${title}\n\u200B`)
                .addFields(
                    { name: '🎮 Spiel', value: `${isLive.game_name || 'Unbekannt'}`, inline: true },
                    { name: '👥 Zuschauer', value: `${viewers.toLocaleString('de-DE')}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false },
                    { name: '🔗 Link', value: `https://twitch.tv/${isLive.user_login}`, inline: false }
                )
                .setThumbnail(profileImage)
                .setImage(thumbnail)
                .setFooter({
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/2111/2111668.png',
                    text: `Twitch - ${formattedTime} Uhr`
                });

            const previous = liveStatus[streamer];

            // Wenn noch nie gepostet → sende neue Nachricht
            if (!previous?.announced || !previous?.messageId) {
                const sent = await channel.send({ content: '||@everyone||', embeds: [embed] });

                liveStatus[streamer] = {
                    isLive: true,
                    announced: true,
                    messageId: sent.id,
                    title,
                    viewers,
                    thumbnail
                };
            } else {
                // Prüfe auf Änderungen
                const hasChanges =
                    previous.title !== title ||
                    previous.viewers !== viewers ||
                    previous.thumbnail !== thumbnail;

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
                    } catch (err) {
                        console.warn(`⚠️ Nachricht von ${streamer} konnte nicht bearbeitet werden:`, err);
                    }
                }
            }
        }
    }

    await updateLiveStatusOnGitHub(liveStatus);
}
