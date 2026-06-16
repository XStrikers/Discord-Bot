import { db } from '../economy.js';

export async function getTikTokStatus(username) {

    const [rows] = await db.execute(
        'SELECT * FROM tiktok_livestatus WHERE username = ?',
        [username]
    );

    return rows[0] || null;
}

export async function updateTikTokStatus(data) {

    await db.execute(`
        INSERT INTO tiktok_livestatus
        (
            username,
            is_live,
            announced,
            message_id,
            total_likes,
            total_gifts
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            is_live = VALUES(is_live),
            announced = VALUES(announced),
            message_id = VALUES(message_id),
            total_likes = VALUES(total_likes),
            total_gifts = VALUES(total_gifts)
    `,
    [
        data.username,
        data.is_live,
        data.announced,
        data.message_id,
        data.total_likes,
        data.total_gifts
    ]);
}
