const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Starte den Express-Server
const app = express();
const PORT = process.env.PORT || 10001;

app.get("/", (req, res) => {
    res.send("🤖 Bot läuft noch und ist aktiv.");
});

app.listen(PORT, () => {
    console.log(`✅ KeepAlive-Server läuft auf Port ${PORT}`);
});

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
