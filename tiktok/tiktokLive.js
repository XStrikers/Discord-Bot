import { TikTokLiveConnection, SignConfig } from 'tiktok-live-connector';

const tiktokUsername = 'bayboyzed';
const discordChannelId = '1152537702089097329';

// Hilfsfunktion: Holt die ID über das stabile Livecounts-Gateway
async function fetchRoomIdFree(username) {
    try {
        // Schritt 1: Hole die interne numerische TikTok-User-ID
        const userRes = await fetch(`https://livecounts.io{username}`);
        if (!userRes.ok) throw new Error('Livecounts-Suchanfrage fehlgeschlagen.');
        
        const userData = await userRes.json();
        const userId = userData?.users?.[0]?.userId;
        
        if (!userId) {
            throw new Error(`TikTok-Nutzer @${username} wurde nicht gefunden.`);
        }

        // Schritt 2: Prüfe mit der User-ID, ob ein Live-Stream und eine Room-ID aktiv sind
        const liveRes = await fetch(`https://livecounts.io{userId}`);
        if (!liveRes.ok) throw new Error('Live-Status-Abfrage fehlgeschlagen.');
        
        const liveData = await liveRes.json();
        
        // Wenn der User live ist, liefert Livecounts die Room-ID
        if (liveData && liveData.roomId && liveData.roomId !== "0") {
            return liveData.roomId;
        }
        
        throw new Error("Streamer ist aktuell offline.");
    } catch (err) {
        throw new Error(`ID-Ermittlung fehlgeschlagen: ${err.message}`);
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

        // 1. Hole die Room-ID über die alternative Livecounts-API
        const currentRoomId = await fetchRoomIdFree(tiktokUsername);
        console.log(`[TikTok] Room-ID gefunden: ${currentRoomId}. Starte Verbindung...`);

        // 2. Initialisiere Connector NUR mit der ermittelten Room-ID
        const tiktokLive = new TikTokLiveConnection(tiktokUsername, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            roomId: currentRoomId, 
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
        // Gibt eine saubere Log-Meldung aus, statt das Skript abstürzen zu lassen
        console.log(`[TikTok] Info: ${error.message || error}`);
    }
}
