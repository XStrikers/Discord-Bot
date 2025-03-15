const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function listCommands(guildId) {
    try {
        const commands = await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId));
        console.log('📋 Registrierte Befehle:', commands);
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Befehle:', error);
    }
}

// Server-ID hier eintragen!
listCommands('1346803035371864134');
