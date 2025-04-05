import axios from 'axios';

// GitHub Repository URL und Token
const githubUrl = 'https://api.github.com/repos/XStrikers/Discord-Bot/contents/twitch/streamers.json';

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

        // Hole die SHA der aktuellen Datei
        const sha = currentContent.sha;

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

        // Antwort an Discord
        if (!interaction.replied) {
            await interaction.reply('GitHub-Repository wurde erfolgreich aktualisiert!');
        } else {
            await interaction.followUp('GitHub-Repository wurde erfolgreich aktualisiert!');
        }
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren von GitHub:', error);

        // Fehlerantwort an Discord
        if (!interaction.replied) {
            await interaction.reply('Es gab einen Fehler beim Aktualisieren der Streamer-Liste.');
        } else {
            await interaction.followUp('Es gab einen Fehler beim Aktualisieren der Streamer-Liste.');
        }
    }
};
