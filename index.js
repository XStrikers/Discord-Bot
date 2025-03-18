require('dotenv').config();
require('./misc/protocol');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cooldowns = require('./cooldowns');
const express = require('express');
const app = express();
const port = process.env.PORT;

if (port) {  // Server nur starten, wenn PORT existiert
    app.get('/', (req, res) => {
        res.send('Bot läuft!');
    });

    app.listen(port, () => {
        console.log(`🌐 Server läuft auf Port ${port}`);
    });
} else {
    console.log("⚠️ Kein Port gesetzt – Express-Server wird nicht gestartet.");
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// Lade die GUILD_ID aus der .env-Datei
const guildId = process.env.GUILD_ID

// Lade alle Befehle
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Registrierung der Slash-Befehle bei Discord
const registerCommands = async () => {
    try {
        const commands = client.commands.map(command => command.data.toJSON());
        
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        
        console.log('🚀 Starte die Befehlsregistrierung...');

        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
            body: commands,
        });

        console.log('✅ Befehle erfolgreich bei Discord registriert!');
    } catch (error) {
        console.error('❌ Fehler bei der Registrierung der Befehle:', error);
    }
};

client.once('ready', () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);
    registerCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await interaction.deferReply();
        
        await command.execute(interaction, client);

        await interaction.editReply('Befehl ausgeführt!');
    } catch (error) {
        console.error('❌ Fehler bei Befehl:', error);

        if (!interaction.replied) {
            await interaction.reply({ content: 'Es ist ein Fehler aufgetreten.', flags: 64 });
        }
    }
});

client.login(process.env.TOKEN);
