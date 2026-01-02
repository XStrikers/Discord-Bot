import { db } from '../economy.js';

export async function getLiveStatus(streamer) {
    const [rows] = await db.query(
        'SELECT * FROM twitch_livestatus WHERE streamer = ?',
        [streamer]
    );
    return rows[0] || null;
}

export async function upsertLiveStatus(data) {
    await db.query(`
        INSERT INTO twitch_livestatus
        (streamer, isLive, announced, messageId, title, game, viewers)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        isLive = VALUES(isLive),
        announced = VALUES(announced),
        messageId = VALUES(messageId),
        title = VALUES(title),
        game = VALUES(game),
        viewers = VALUES(viewers)
    `, [
        data.streamer,
        data.isLive,
        data.announced,
        data.messageId,
        data.title,
        data.game,
        data.viewers
    ]);
}

export async function getAllStreamers() {
    const [rows] = await db.query(
        'SELECT streamer FROM twitch_livestatus ORDER BY streamer ASC'
    );
    return rows.map(r => r.streamer);
}

export async function addStreamer(streamer) {
    await db.query(
        `INSERT IGNORE INTO twitch_livestatus 
         (streamer, isLive, announced, messageId, title, game, viewers)
         VALUES (?, 0, 0, NULL, NULL, NULL, 0)`,
        [streamer]
    );
}

export async function removeStreamer(streamer) {
    await db.query(
        'DELETE FROM twitch_livestatus WHERE streamer = ?',
        [streamer]
    );
}
