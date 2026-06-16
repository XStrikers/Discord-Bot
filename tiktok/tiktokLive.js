import { TikTokLiveConnection } from 'tiktok-live-connector';

const tiktokUsername = 'tits.19';

export async function startTikTokLive(client) {
    try {
        const tiktokLive = new TikTokLiveConnection(tiktokUsername, {
            processInitialData: true,
            enableExtendedGiftInfo: true,
            enableWebsocketUpgrade: true,
            requestPollingIntervalMs: 2000,
            requestOptions: {
                timeout: 10000
            },
            websocketOptions: {
                timeout: 10000
            }
        });

        const state = await tiktokLive.connect();

        console.log(`[TikTok] Verbunden mit @${tiktokUsername}`);
        console.log(`[TikTok] Room ID: ${state.roomId}`);

    } catch (error) {
        console.error('[TikTok] Verbindung fehlgeschlagen:', error);
    }
}
