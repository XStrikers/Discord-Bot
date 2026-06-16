import { TikTokLiveConnection } from 'tiktok-live-connector';

const tiktokUsername = 'shimmersnips';

export async function startTikTokLive(client) {
    const tiktokLive = new TikTokLiveConnection(tiktokUsername);

    try {
        const state = await tiktokLive.connect();

        console.log(`[TikTok] Verbunden mit @${tiktokUsername}`);
        console.log(`[TikTok] Room ID: ${state.roomId}`);

    } catch (error) {
        console.error('[TikTok] Verbindung fehlgeschlagen:', error);
    }
}
