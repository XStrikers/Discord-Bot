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

export default { pool, getCoins, getLevel };
