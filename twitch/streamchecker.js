import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let accessToken = '';
const streamersPath = path.join(__dirname, 'streamers.json');
const liveStatusPath = path.join(__dirname, 'livestatus.json');

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

async function loadJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return {};
    }
}

async function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function checkTwitchStreams(client) {
    if (!accessToken) {
        accessToken = await getAccessToken();
    }

    const streamers = JSON.parse(fs.readFileSync(streamersPath));
    const liveStatus = await loadJson(liveStatusPath);
    const userQuery = streamers.map(s => `user_login=${s}`).join('&');

    const res = await fetch(`https://api.twitch.tv/helix/streams?${userQuery}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await res.json();
    const liveNow = data.data;
    const channel = await client.channels.fetch(process.env.TWITCH_CHANNEL_ID);

    for (const streamer of streamers) {
        const isLive = liveNow.find(s => s.user_login.toLowerCase() === streamer.toLowerCase());

        if (isLive && !liveStatus[streamer]) {
            const msg = `🔴 **${isLive.user_name}** ist jetzt **LIVE** auf Twitch!\n🎮 ${isLive.title}\n👉 https://twitch.tv/${isLive.user_login}`;
            await channel.send({ content: `@everyone\n${msg}` });

            liveStatus[streamer] = true;
        } else if (!isLive) {
            liveStatus[streamer] = false;
        }
    }

    await saveJson(liveStatusPath, liveStatus);
}
