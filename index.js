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

app.post('/tiktok/live-alert', async (req, res) => {
    try {
        const data = req.body || {};

        console.log('[TikTok Webhook] Daten erhalten:', data);

        const isTestWebhook =
            !data.username &&
            !data.nickname &&
            !data.title &&
            !data.cover_url &&
            !data.avatar_url;
        
        const username = isTestWebhook
            ? 'xstrikers_gaming'
            : data.username || 'xstrikers_gaming';
        
        const nickname = isTestWebhook
            ? 'XStrikers Gaming'
            : data.nickname || username;
        
        const title = isTestWebhook
            ? 'Test-Livestream über EulerStream'
            : data.title || 'TikTok Livestream';
        
        const viewers = isTestWebhook
            ? 'Testmodus'
            : data.current_viewers || 'Unbekannt';
        
        const avatarUrl = isTestWebhook
            ? null
            : data.avatar_url || null;
        
        const coverUrl = isTestWebhook
            ? null
            : data.cover_url || null;
        
        const startTime = isTestWebhook
            ? Math.floor(Date.now() / 1000)
            : Number(data.start_time) || Math.floor(Date.now() / 1000);

        const channel = await client.channels.fetch(
            process.env.TIKTOK_LIVESTREAM_CHANNEL_ID
        );

        if (!channel) {
            return res.status(404).json({
                success: false,
                message: 'Discord channel not found'
            });
        }

        const streamUrl = `https://www.tiktok.com/@${username}/live`;

        const embed = new EmbedBuilder()
            .setColor('#00FCFF')
            .setTitle(`🔴 ${nickname} ist jetzt LIVE!`)
            .setURL(streamUrl)
            .setDescription(
                [
                    isTestWebhook
                        ? `🧪 **Test-Webhook erfolgreich empfangen.**`
                        : `${title}\n\u200B`
            )
            .addFields(
                { name: '🎮 TikTok', value: '@${username}' || 'Unbekannt', inline: true },
                { name: '👥 Zuschauer', value: '${viewers}', inline: true },
                { name: '🕒 Laufzeit', value: '<t:${startTime}:R>', inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '🔗 Link', value: `(streamUrl)`, inline: false }
            )
            .setTimestamp()
            .setFooter({
                iconURL: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
                text: 'TikTok Live • XStrikers Gaming Netzwerk'
            });

        if (avatarUrl) embed.setThumbnail(avatarUrl);
        if (coverUrl) embed.setImage(coverUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('${nickname} Stream öffnen')
                .setStyle(ButtonStyle.Link)
                .setURL(streamUrl)
        );

        await channel.send({
            content: '||@everyone||',
            embeds: [embed],
            components: [row]
        });

        return res.status(200).json({
            success: true
        });

    } catch (error) {
        console.error('[TikTok Webhook] Fehler:', error);

        return res.status(500).json({
            success: false
        });
    }
});

client.login(process.env.TOKEN);
