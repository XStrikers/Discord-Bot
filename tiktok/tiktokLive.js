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

        const channel = await client.channels.fetch(discordChannelId);

        if (!channel) {
            console.error('[Discord] TikTok-Livestream-Channel nicht gefunden.');
            return;
        }

        await channel.send(
            `🔴 **TikTok LIVE**\n@${tiktokUsername} ist jetzt live!\nhttps://www.tiktok.com/@${tiktokUsername}/live`
        );

        console.log(`[Discord] TikTok Live-Meldung für @${tiktokUsername} gesendet.`);

    } catch (error) {
        console.error('[TikTok] Verbindung fehlgeschlagen:', error);
    }
}
