// db_ping.js
import { pool } from '../economy.js';

const CHANNEL_ID = process.env.CHANNEL_ID;

export const startDbPing = (client) => {
    setInterval(async () => {
        try {
            await pool.query('SELECT 1');
            console.log('🔄 Datenbank-Ping erfolgreich');

            // Nachricht im Discord-Channel senden
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                await channel.send('✅ Datenbank-Ping erfolgreich ausgeführt!');
                console.log("✅ PIng an die Datenbank gesendet");
            } else {
                console.warn('⚠️ Ping-Channel nicht gefunden.');
            }
        } catch (error) {
            console.error('❌ Datenbank-Ping fehlgeschlagen:', error);

            // Fehler im Channel melden
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                channel.send('❌ Fehler beim Datenbank-Ping! Details in der Konsole.');
            }
        }
    }, 10 * 60 * 1000); // alle 10 Minuten
};
