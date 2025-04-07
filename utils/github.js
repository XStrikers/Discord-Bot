import axios from 'axios';

const githubUrl = 'https://api.github.com/repos/XStrikers/Discord-Bot/contents/twitch/streamers.json';
const token = process.env.GITHUB_TOKEN;

// ✅ Funktion zum Abrufen der aktuellen Streamer-Liste + SHA
export const getStreamersFromGitHub = async () => {
    try {
        const response = await axios.get(githubUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const sha = response.data.sha;

        return {
            streamers: JSON.parse(content),
            sha
        };
    } catch (error) {
        console.error('❌ Fehler beim Abrufen von GitHub:');
        console.error('Status:', error.response?.status);
        console.error('Nachricht:', error.response?.data?.message);
        return { streamers: [], sha: null };
    }
};

// ✅ Funktion zum Aktualisieren der Datei
export const updateStreamersOnGitHub = async (streamers) => {
    try {
        const { sha } = await getStreamersFromGitHub();

        if (!sha) {
            throw new Error("SHA konnte nicht abgerufen werden – Datei existiert nicht?");
        }

        const updatedContent = Buffer.from(JSON.stringify(streamers, null, 2)).toString('base64');

        const response = await axios.put(githubUrl, {
            message: 'Aktualisiere Streamer-Liste',
            content: updatedContent,
            sha: sha
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('✅ GitHub-Repository erfolgreich aktualisiert!');
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren von GitHub:');
        console.error('Status:', error.response?.status);
        console.error('Nachricht:', error.response?.data?.message);
        console.error('Details:', error.message);
    }
};

