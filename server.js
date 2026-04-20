const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple route for the home page (though express.static usually handles this)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}\n`);
});
