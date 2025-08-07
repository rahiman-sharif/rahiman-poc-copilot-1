const express = require('express');
const router = express.Router();

console.log('📊 Settings router test loaded');

// Simple test route
router.get('/', (req, res) => {
    res.send('Settings test working');
});

module.exports = router;
