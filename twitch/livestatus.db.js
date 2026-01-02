import { db } from '../economy.js';

export async function getLiveStatus(streamer) {
    const [rows] = await db.query(
        'SELECT * FROM twitch_live_status WHERE streamer = ?',
        [streamer]
    );
    return rows[0] || null;
}

export async function upsertLiveStatus(data) {
    await db.query(`
        INSERT INTO twitch_live_status
        (streamer, isLive, announced, messageId, title, viewers)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        isLive = VALUES(isLive),
        announced = VALUES(announced),
        messageId = VALUES(messageId),
        title = VALUES(title),
        viewers = VALUES(viewers)
    `, [
        data.streamer,
        data.isLive,
        data.announced,
        data.messageId,
        data.title,
        data.viewers
    ]);
}
