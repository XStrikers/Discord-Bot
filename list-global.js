const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once('ready', async () => {
    try {
        // Holen Sie sich alle globalen Befehle
        const commands = await client.application.commands.fetch();
        
        console.log('Alle globalen Befehle:');
        commands.forEach(command => {
            console.log(`Name: ${command.name}, ID: ${command.id}`);
        });
    } catch (error) {
        console.error('Fehler beim Abrufen der globalen Befehle:', error);
    }
});

client.login(process.env.TOKEN);
