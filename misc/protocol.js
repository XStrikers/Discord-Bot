const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Discord Bot Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", () => {
    console.log(`✅ Bot ist bereit als ${client.user.tag}`);

    // Alle 30 Minuten eine Nachricht in den angegebenen Channel senden
    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                await channel.send("Ich bin noch online! ✅");
                console.log("✅ Keep-Alive Nachricht gesendet");
            }
        } catch (error) {
            console.error("❌ Fehler beim Senden der Keep-Alive Nachricht:", error);
        }
    }, 30 * 60 * 1000); // 30 Minuten
});

// Bot einloggen
client.login(TOKEN);
