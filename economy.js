import mysql from 'mysql2/promise';

// Datenbankverbindung erstellen (Pool)
export const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// Funktion zum Abrufen der Coins eines Benutzers
export async function getCoins(userId) {
    try {
        const [rows] = await db.execute('SELECT coins FROM discord_user WHERE discord_id = ?', [userId]);
        return rows.length > 0 ? rows[0].coins : null;
    } catch (error) {
        console.error('Fehler beim Abrufen der Coins:', error);
        return null;
    }
}

// Funktion zum Abrufen des Levels eines Benutzers
export async function getLevel(userId) {
    try {
        const [rows] = await db.execute('SELECT level FROM discord_user WHERE discord_id = ?', [userId]);
        return rows.length > 0 ? rows[0].level : null;
    } catch (error) {
        console.error('Fehler beim Abrufen des Levels:', error);
        return null;
    }
}

// Funktion zum Abrufen kompletter User-Stats
export async function getUserStats(userId) {
    try {
        const [rows] = await db.execute(`
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
    } catch (error) {
        console.error('Fehler beim Abrufen der User Stats:', error);
        return null;
    }
}

// Funktion zum Abrufen aller User-Stats (Ranking)
export async function getAllUserStats() {
    try {
        const [rows] = await db.execute(`
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
    } catch (error) {
        console.error('Fehler beim Abrufen aller User Stats:', error);
        return [];
    }
}

// Funktion zum Hinzufügen von XP und Coins (Insert oder Update)
export async function addXPAndCoins(userId, xpAmount, coinAmount) {
    let attempt = 0;
    while (attempt < 2) {
        try {
            const [rows] = await db.execute('SELECT * FROM discord_user WHERE discord_id = ?', [userId]);

            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO discord_user (discord_id, current_xp, coins) VALUES (?, ?, ?)',
                    [userId, xpAmount, coinAmount]
                );
            } else {
                await db.execute(
                    'UPDATE discord_user SET current_xp = current_xp + ?, coins = coins + ? WHERE discord_id = ?',
                    [xpAmount, coinAmount, userId]
                );
            }

            console.log(`✅ ${userId} hat ${xpAmount} XP und ${coinAmount} Coins erhalten.`);
            return;
        } catch (error) {
            if (error.code === 'ECONNRESET' && attempt < 1) {
                console.warn('🔁 Verbindung wurde zurückgesetzt. Neuer Versuch...');
                attempt++;
                continue;
            }
            console.error('❌ Fehler beim Hinzufügen von XP und Coins:', error);
            throw error;
        }
    }
}

// Verbindung alle 3 Minuten testen, damit sie nicht einschläft (Keep-Alive)
setInterval(async () => {
    try {
        await db.query('SELECT 1');
        console.log('✅ MySQL-Verbindung aktiv');
    } catch (err) {
        console.warn('⚠️ MySQL Keep-Alive fehlgeschlagen:', err.message);
    }
}, 300_000); // alle 3 Minuten
