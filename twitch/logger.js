// logger.js
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logsDir = path.join(__dirname, 'logs');

// Stelle sicher, dass der logs-Ordner existiert
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

/**
 * Schreibt eine Nachricht mit Zeitstempel in eine Logdatei.
 * @param {string} filename – Name der Logdatei, z. B. 'streams.log'
 * @param {string} message – Die eigentliche Nachricht
 */
export function logToFile(filename, message) {
    const logPath = path.join(logsDir, filename);
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const fullMessage = `[${timestamp}] ${message}\n`;
    fs.appendFile(logPath, fullMessage, err => {
        if (err) console.error('❌ Fehler beim Schreiben in Log:', err);
    });
}
