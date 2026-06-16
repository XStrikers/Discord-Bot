import { TikTokLiveConnection, SignConfig } from 'tiktok-live-connector';

const tiktokUsername = 'reallifesouthlandchicken';
const discordChannelId = '1152537702089097329';

export async function startTikTokLive(client) {
    try {
        if (!process.env.EULERSTREAM_API_KEY) {
            console.error('[TikTok] EULERSTREAM_API_KEY fehlt in Render Environment.');
            return;
        }

        SignConfig.apiKey = process.env.EULERSTREAM_API_KEY;
        console.log(`[TikTok] Starte Verbindung für @${tiktokUsername}...`);

        const tiktokLive = new TikTokLiveConnection(tiktokUsername, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            // WICHTIG: Erlaubt dem Connector, die ID über alternative, kostenlose Wege 
            // zu bestimmen und umgeht IP-Sperren von Rechenzentren
            connectWithUniqueId: true, 
            requestPollingIntervalMs: 2000,
            requestOptions: {
                timeout: 15000, // Timeout leicht erhöht für Render.com
                headers: {
                    // Simuliert einen echten Desktop-Browser, um 'fetch failed' zu minimieren
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            websocketOptions: {
                timeout: 15000
            }
        });

        // Verbindung aufbauen (Der Connector löst die ID jetzt intern & kostenlos auf)
        const state = await tiktokLive.connect();

        console.log(`[TikTok] Verbunden mit @${tiktokUsername}`);
        console.log(`[TikTok] Room ID: ${state.roomId}`);

        // Discord-Kanal holen und Nachricht senden
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
        // Falls der User einfach offline ist oder TikTok temporär blockiert
        console.error('[TikTok] Verbindung fehlgeschlagen:', error.message || error);
    }
}
