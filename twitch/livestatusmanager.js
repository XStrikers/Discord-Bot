import 'dotenv/config';
import axios from 'axios';

const githubUrl = 'https://api.github.com/repos/XStrikers/Discord-Bot/contents/twitch/livestatus.json';
const token = process.env.GITHUB_TOKEN;

// ✅ Livestatus von GitHub laden
export const getLiveStatusFromGitHub = async () => {
    try {
        const response = await axios.get(githubUrl, {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github+json'
            }

        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const sha = response.data.sha;

        return {
            status: JSON.parse(content),
            sha
        };
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der livestatus.json von GitHub:');
        console.error(error.response?.data?.message || error.message);
        return { status: {}, sha: null };
    }
};

// ✅ Livestatus auf GitHub speichern
export const updateLiveStatusOnGitHub = async (liveStatus) => {
    try {
        const { sha } = await getLiveStatusFromGitHub();

        if (!sha) {
            throw new Error("SHA konnte nicht abgerufen werden – Datei existiert nicht?");
        }

        const updatedContent = Buffer.from(JSON.stringify(liveStatus, null, 2)).toString('base64');

        await axios.put(githubUrl, {
            message: '🔁 Update livestatus.json',
            content: updatedContent,
            sha
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('✅ livestatus.json erfolgreich auf GitHub aktualisiert!');
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren von livestatus.json:');
        console.error(error.response?.data?.message || error.message);
    }
};

