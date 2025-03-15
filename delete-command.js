const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function deleteCommand(commandId, guildId) {
    try {
        await rest.delete(Routes.applicationGuildCommand(process.env.CLIENT_ID, guildId, commandId));
        console.log(`✅ Befehl mit ID ${commandId} gelöscht.`);
    } catch (error) {
        console.error('❌ Fehler beim Löschen:', error);
    }
}

// HIER DIE ID DES BEFEHLS & SERVER-ID EINTRAGEN!
deleteCommand('1349886066043392095', '1346803035371864134');
