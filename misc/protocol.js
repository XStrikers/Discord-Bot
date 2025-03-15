const express = require('express');

const app = express();
const PORT = process.env.PORT || 1000;

// Eine einfache Route, die "OK" zurückgibt
app.get('/', (req, res) => {
    res.send(':robot: Bot läuft noch.');
});

// Starte den Server
app.listen(PORT, () => {
    console.log(`KeepAlive-Server läuft auf Port ${PORT}`);
});

module.exports = app;
