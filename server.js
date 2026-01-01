const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(__dirname));

app.get('*', (req, res) => {
    if (req.path.startsWith('/pages/')) {
        res.sendFile(path.join(__dirname, req.path));
    } else if (req.path === '/' || req.path === '/index.html') {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, req.path));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
