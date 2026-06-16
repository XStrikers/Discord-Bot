import { TikTokLiveConnection, SignConfig } from 'tiktok-live-connector';

const tiktokUsername = 'bayboyzed';
const discordChannelId = '1152537702089097329';

// Hilfsfunktion: Holt die Room-ID kostenlos über die externe TokCount-API
async function fetchRoomIdFree(username) {
    try {
        const response = await fetch(`https://tokcount.com{username}`);
        if (!response.ok) {
            throw new Error('TokCount-API-Antwort war nicht im 2xx-Bereich.');
        }
        
        const data = await response.json();
        
        // Prüft, ob der Nutzer live ist und eine gültige Room-ID existiert
        if (data && data.live_info && data.live_info.room_id) {
            return data.live_info.room_id;
        }
        throw new Error("Streamer ist aktuell offline.");
    } catch (err) {
        throw new Error(`Kostenlose ID-Ermittlung fehlgeschlagen: ${err.message}`);
    }
}

export async function startTikTokLive(client) {
    try {
        if (!process.env.EULERSTREAM_API_KEY) {
            console.error('[TikTok] EULERSTREAM_API_KEY fehlt in Render Environment.');
            return;
        }

        SignConfig.apiKey = process.env.EULERSTREAM_API_KEY;
        console.log(`[TikTok] Ermittle Room-ID für @${tiktokUsername}...`);

        // 1. Hole die Room-ID über die API (umgeht Render-IP-Sperren)
        const currentRoomId = await fetchRoomIdFree(tiktokUsername);
        console.log(`[TikTok] Room-ID gefunden: ${currentRoomId}. Starte Verbindung...`);

        // 2. Initialisiere Connector NUR mit der ermittelten Room-ID
        const tiktokLive = new TikTokLiveConnection(tiktokUsername, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            roomId: currentRoomId, // <-- Zwingt den Connector, den kostenlosen Pfad zu nutzen
            requestPollingIntervalMs: 2000,
            requestOptions: {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            websocketOptions: {
                timeout: 15000
            }
        });

        const state = await tiktokLive.connect();

        console.log(`[TikTok] Verbunden mit @${tiktokUsername}`);
        console.log(`[TikTok] Room ID: ${state.roomId}`);

        // 3. Discord-Kanal holen und Nachricht senden
        const channel = await client.channels.fetch(discordChannelId);
        if (!channel) {
            console.error('[Discord] TikTok-Livestream-Channel nicht gefunden.');
            return;
        }

        await channel.send(
            `🔴 **TikTok LIVE**\n@${tiktokUsername} ist jetzt live!\nhttps://tiktok.com{tiktokUsername}/live`
        );
        console.log(`[Discord] TikTok Live-Meldung für @${tiktokUsername} gesendet.`);

    } catch (error) {
        // Fängt den Zustand ab, wenn der Streamer offline ist (ohne Eulerstream-Fehler)
        console.log(`[TikTok] Info: ${error.message || error}`);
    }
}
