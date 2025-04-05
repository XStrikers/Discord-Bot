import axios from 'axios';

// GitHub Repository URL und Token
const githubUrl = 'https://api.github.com/repos/XStrikers/Discord-Bot/twitch/streamers.json';
const token = process.env.GITHUB_TOKEN;

// Funktion zum Abrufen der Streamer-Liste von GitHub
export const getStreamersFromGitHub = async () => {
    try {
        const response = await axios.get(githubUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // GitHub gibt die Datei als Base64 kodierten Inhalt zurück
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Fehler beim Abrufen von GitHub:', error);
        return [];
    }
};

// Funktion zum Speichern der Streamer-Liste auf GitHub
export const updateStreamersOnGitHub = async (streamers) => {
    try {
        // Zuerst den aktuellen Inhalt der Datei abrufen
        const currentContent = await getStreamersFromGitHub();

        const updatedContent = Buffer.from(JSON.stringify(streamers, null, 2)).toString('base64');

        const response = await axios.put(githubUrl, {
            message: 'Aktualisiere Streamer-Liste',
            content: updatedContent,
            sha: response.data.sha
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('✅ GitHub-Repository erfolgreich aktualisiert!');
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren von GitHub:', error);
    }
};
