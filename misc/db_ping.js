// db_ping.js
import { pool } from '../economy.js';

export const startDbPing = () => {
    setInterval(async () => {
        try {
            await pool.query('SELECT 1');
            console.log('🔄 Datenbank-Ping erfolgreich');
        } catch (error) {
            console.error('❌ Datenbank-Ping fehlgeschlagen:', error);
        }
    }, 10 * 60 * 1000);
};
