const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Funktion zum Löschen eines einzelnen Befehls
async function deleteCommand(commandId) {
    try {
        await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, commandId));
        console.log(`✅ Globaler Befehl mit ID ${commandId} gelöscht.`);
    } catch (error) {
        console.error(`❌ Fehler beim Löschen von ${commandId}:`, error);
    }
}

async function deleteMultipleCommands(commandIds) {
    for (const commandId of commandIds) {
        await deleteCommand(commandId);
    }
}

deleteMultipleCommands(
    [
        '1349852290554790099',
        '1349852290554790100',
        '1349852290554790101',
        '1349852290554790102',
        '1349852290554790103',
        '1349852290554790104'
    ],
);
