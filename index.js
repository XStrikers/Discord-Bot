import 'dotenv/config';
import './misc/protocol.js';
import { startDbPing } from './misc/db_ping.js';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cooldowns from './cooldowns.js';
import { checkTwitchStreams } from './twitch/streamchecker.js';
import { logToFile } from './twitch/logger.js';
logToFile('streams.log', '🚀 Bot wurde gestartet');

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT;

if (port) {
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
const guildId = process.env.GUILD_ID;
client.commands = new Collection();
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

const loadCommands = async () => {
    for (const file of commandFiles) {
        const { default: command } = await import(`./commands/${file}`);
        client.commands.set(command.data.name, command);
    }
};

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

client.once('ready', async () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);

    try {
        await loadCommands();
        await loadEvents();
        await registerCommands();

        // Starte den Datenbank-Ping
        startDbPing(client);

        console.log("📡 Starte Twitch Stream-Checker...");
        setInterval(() => checkTwitchStreams(client), 10 * 60 * 1000);
        console.log("🔄 Twitch Stream-Check ausgeführt...");
    } catch (err) {
        console.error("❌ Fehler bei Initialisierung:", err);
    }
});

const loadEvents = async () => {
    const eventFiles = readdirSync(join(__dirname, 'events')).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const { default: event } = await import(`./events/${file}`);
        if (event.name && event.execute) {
            client.on(event.name, (...args) => event.execute(...args));
            console.log(`📥 Event geladen: ${event.name}`);
        }
    }
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error('❌ Fehler bei Befehl:', error);

        if (!interaction.replied) {
            await interaction.reply({ content: 'Es ist ein Fehler aufgetreten. Versuche es bitte erneut.', flags: 64 });
        }
    }
});

client.login(process.env.TOKEN);
