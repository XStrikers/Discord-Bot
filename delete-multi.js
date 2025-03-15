const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function deleteMultipleCommands(commandIds, guildId) {
    for (const commandId of commandIds) {
        try {
            await rest.delete(Routes.applicationGuildCommand(process.env.CLIENT_ID, guildId, commandId));
            console.log(`✅ Server-Befehl mit ID ${commandId} gelöscht.`);
        } catch (error) {
            console.error(`❌ Fehler beim Löschen von ${commandId}:`, error);
        }
    }
}

deleteMultipleCommands(
    [
        '1349300635412992090',
        '1349300635412992091',
        '1349300635412992092',
        '1349300635412992093',
        '1349321251570581544',
        '1349856041923510324',
        ''
    ],
    '1346803035371864134'
);
