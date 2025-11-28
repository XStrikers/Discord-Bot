// db_ping.js
import { pool } from '../economy.js';

const CHANNEL_ID = process.env.CHANNEL_ID;

export const startDbPing = (client) => {
    setInterval(async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query('SELECT 1');
            connection.release();

            console.log('🔄 Datenbank-Ping erfolgreich');

            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                channel.send('✅ Datenbank-Ping erfolgreich ausgeführt!');
            }
        } catch (error) {
            console.error('❌ Datenbank-Ping fehlgeschlagen:', error);

            try {
                const channel = await client.channels.fetch(CHANNEL_ID);
                if (channel) {
                    channel.send('❌ Fehler beim Datenbank-Ping! ECONNRESET – Verbindung wurde zurückgesetzt.');
                }
            } catch (e) {
                console.error('⚠️ Fehler beim Senden an Discord:', e);
            }
        }
    }, 2 * 60 * 1000);
};
