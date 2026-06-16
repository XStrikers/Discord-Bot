import { TikTokLiveConnection, SignConfig } from 'tiktok-live-connector';

const tiktokUsername = 'reallifesouthlandchicken';
const discordChannelId = '1152537702089097329';

// Hilfsfunktion: Holt die Room-ID kostenlos über die TikTok-Webseite statt über die API
async function fetchRoomIdFree(username) {
    try {
        const response = await fetch(`https://tiktok.com{username}/live`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await response.text();
        
        // Sucht nach der RoomId im HTML-Quelltext der Seite
        const match = html.match(/"roomId":"(\d+)"/);
        if (match && match[1]) {
            return match[1];
        }
        throw new Error("Streamer ist offline oder Room-ID wurde nicht im HTML gefunden.");
    } catch (err) {
        throw new Error(`Kostenlose Room-ID Ermittlung fehlgeschlagen: ${err.message}`);
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
        
        // 1. Raum-ID kostenlos abrufen
        const currentRoomId = await fetchRoomIdFree(tiktokUsername);
        console.log(`[TikTok] Room-ID erfolgreich ermittelt: ${currentRoomId}`);

        // 2. Connector mit der festen Room-ID initialisieren (umgeht die Business-Route)
        const tiktokLive = new TikTokLiveConnection(tiktokUsername, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            requestPollingIntervalMs: 2000,
            roomId: currentRoomId, // <-- Das ist der entscheidende Fix!
            requestOptions: {
                timeout: 10000
            },
            websocketOptions: {
                timeout: 10000
            }
        });

        const state = await tiktokLive.connect();

        console.log(`[TikTok] Verbunden mit @${tiktokUsername}`);

        // 3. Discord-Nachricht senden
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
        // Fängt sowohl Offline-Zustände als auch API-Fehler ab
        console.error('[TikTok] Verbindung fehlgeschlagen:', error.message || error);
    }
}
