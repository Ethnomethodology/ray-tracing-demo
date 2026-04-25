const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Explicit routes for clean URLs
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/part2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'part2.html'));
});

app.get('/part3', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'part3.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}\n`);
});
