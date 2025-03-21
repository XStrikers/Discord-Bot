import 'dotenv/config';
import './misc/protocol.js';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cooldowns from './cooldowns.js';

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
const guildId = process.env.GUILD_ID
client.commands = new Collection();
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const { default: command } = await import(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

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
            await interaction.reply({ content: 'Es ist ein Fehler aufgetreten. Versuche es bitte erneut.', flags: 64 });
        }
    }
});

client.login(process.env.TOKEN);
