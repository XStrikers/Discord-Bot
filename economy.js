import mysql from 'mysql2/promise';

// Datenbankverbindung erstellen
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    idleTimeout: 60000,
});

// Funktion zum Abrufen der Coins eines Benutzers
export async function getCoins(userId) {
    try {
        const [rows] = await pool.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
        return rows.length > 0 ? rows[0].coins : null;
    } catch (error) {
        console.error('Fehler beim Abrufen der Coins:', error);
        return null;
    }
}

// Funktion zum Abrufen des Levels eines Benutzers
export async function getLevel(userId) {
    try {
        const [rows] = await pool.execute('SELECT level FROM discord_user WHERE discord_id = ?', [userId]);
        return rows.length > 0 ? rows[0].level : null;
    } catch (error) {
        console.error('Fehler beim Abrufen des Levels:', error);
        return null;
    }
}

export async function getUserStats(userId) {
    const [rows] = await pool.execute(`
        SELECT 
            discord_id, 
            username,
            display_name,
            level, 
            current_xp, 
            xp_needed, 
            coins 
        FROM discord_user
        WHERE discord_id = ?
    `, [userId]);

    return rows.length > 0 ? rows[0] : null;
}

export async function getAllUserStats() {
    const [rows] = await pool.execute(`
        SELECT 
            CAST(discord_id AS CHAR) AS discord_id,
            username,
            display_name,
            level, 
            current_xp, 
            xp_needed, 
            coins 
        FROM discord_user
        ORDER BY level DESC, current_xp DESC
    `);
    return rows;
}

export async function addXPAndCoins(userId, xpAmount, coinAmount) {
    try {
        // Benutzer prüfen, ob vorhanden
        const [rows] = await pool.execute('SELECT * FROM discord_user WHERE discord_id = ?', [userId]);

        if (rows.length === 0) {
            // Optional: Benutzer anlegen, falls nicht vorhanden
            await pool.execute(
                'INSERT INTO discord_user (discord_id, current_xp, coins) VALUES (?, ?, ?)',
                [userId, xpAmount, coinAmount]
            );
        } else {
            // XP und Coins addieren
            await pool.execute(
                'UPDATE discord_user SET current_xp = current_xp + ?, coins = coins + ? WHERE discord_id = ?',
                [xpAmount, coinAmount, userId]
            );
        }

        console.log(`✅ ${userId} hat ${xpAmount} XP und ${coinAmount} Coins erhalten.`);
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen von XP und Coins:', error);
        throw error;
    }
}
