import 'dotenv/config';
import './misc/protocol.js';
import { startDbPing } from './misc/db_ping.js';
import { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cooldowns from './cooldowns.js';
import { checkTwitchStreams } from './twitch/streamchecker.js';
import { logToFile } from './twitch/logger.js';
import lkwEventHandler from './events/lkwEventHandler.js';

logToFile('streams.log', '🚀 Bot wurde gestartet');

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const port = process.env.PORT;

// Express Webserver starten (z. B. für Uptime-Keeper wie UptimeRobot)
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

const guildId = process.env.GUILD_ID;
client.commands = new Collection();

const loadCommands = async () => {
    const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const { default: command } = await import(`./commands/${file}`);
        client.commands.set(command.data.name, command);
    }
};

const registerCommands = async () => {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        const commands = client.commands.map(command => command.data.toJSON());

        console.log('🚀 Starte die Befehlsregistrierung...');
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
            body: commands,
        });

        console.log('✅ Befehle erfolgreich bei Discord registriert!');
    } catch (error) {
        console.error('❌ Fehler bei der Registrierung der Befehle:', error);
    }
};

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

client.once('ready', async () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);

    try {
        await loadCommands();
        await loadEvents();
        await registerCommands();

        startDbPing(client);

        console.log("📡 Starte Twitch Stream-Checker...");
        await checkTwitchStreams(client);
        setInterval(() => checkTwitchStreams(client), 5 * 60 * 1000);
        console.log("🔄 Twitch Stream-Check ausgeführt...");

    } catch (err) {
        console.error("❌ Fehler bei Initialisierung:", err);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        // Slash-Commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, client);
        }

        // Button-Interaktionen (z. B. LKW MiniGame)
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('select_job_')) {
                await lkwEventHandler.execute(interaction);
            }
            // Du kannst hier weitere Button-IDs prüfen:
            // else if (interaction.customId.startsWith('quiz_')) { ... }
        }

    } catch (error) {
        console.error('❌ Fehler bei Interaction:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
                flags: 64
            });
        }
    }
});

client.on(lkwEventHandler.name, (...args) => lkwEventHandler.execute(...args));

app.get('/tiktok/live-start', async (req, res) => {
    try {

        const channel = await client.channels.fetch(
            process.env.TIKTOK_LIVESTREAM_CHANNEL_ID
        );

        if (!channel) {
            return res.status(404).send('Channel nicht gefunden');
        }

        const startTime = Math.floor(Date.now() / 1000);

        const streamMessages = [
            '🔥 Der Stream ist live! Komm vorbei und werde Teil der Community.',
            '🎮 Neue Runde, neue Momente, neues Chaos – schalte jetzt ein!',
            '🚀 Es geht los! Sei live dabei und verpasse keinen Moment.',
            '👾 Gaming, Spaß und Community – genau jetzt live auf TikTok.',
            '💥 Der Stream läuft. Komm rein, sag Hallo und genieße die Show!'
        ];
        
        const randomMessage = streamMessages[
            Math.floor(Math.random() * streamMessages.length)
        ];

        const embed = new EmbedBuilder()
            .setColor('#00FCFF')
            .setTitle('🔴 XStrikers Gaming ist jetzt LIVE!')
            .setDescription(`${randomMessage}\n\u200B`)
            .addFields(
                {
                    name: '📷 Creator',
                    value: '@xstrikers_gaming',
                    inline: true
                },
                {
                    name: '🕒 Streamzeit',
                    value: `<t:${startTime}:R>`,
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: '🧊 Server',
                    value: 'Eisfurt Roleplay',
                    inline: true
                },
                {
                    name: '🛬 Einreise',
                    value: `Whitelist Einreise`,
                    inline: true
                },   
                {
                    name: '🎮 Discord',
                    value: `discord.gg/p8f5G4kwA4`,
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: '🎬 Aktueller Stream',
                    value: 'https://www.tiktok.com/@xstrikers_gaming/live',
                    inline: false
                }
            )
            .setThumbnail('https://p19-common-sign.tiktokcdn-eu.com/tos-useast2a-avt-0068-euttp/73cadfaef88e341fa3be4936d3a909fa~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=10399&refresh_token=83c1c5a4&x-expires=1782399600&x-signature=cg0ua8jD25ALzD3TaEJ6kwBY9YM%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a')
            .setImage('https://i.imgur.com/wYU9u58.jpeg')
            .setTimestamp()
            .setFooter({
                iconURL: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
                text: 'TikTok LIVE'
            });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🎥 Stream')
                .setStyle(ButtonStyle.Link)
                .setURL('https://www.tiktok.com/@xstrikers_gaming/live'),

            new ButtonBuilder()
                .setLabel('💬 Discord')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/p8f5G4kwA4')
        );

        await channel.send({
            content: '||@everyone||',
            embeds: [embed],
            components: [row]
        });

        return res.status(200).send('Discord Meldung gesendet');

    } catch (error) {
        console.error('[TikTok Live Start] Fehler:', error);
        return res.status(500).send('Fehler beim Senden');
    }
});

client.login(process.env.TOKEN);
