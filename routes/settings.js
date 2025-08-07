const express = require('express');
const router = express.Router();

console.log('⚙️ Fresh Settings Router Created!');

// Test route to ensure router works
router.get('/', (req, res) => {
    console.log('📋 Settings route accessed!');
    res.send(`
        <h1>✅ Settings Working!</h1>
        <p>User: ${req.session.user?.username || 'Not logged in'}</p>
        <p>This is a fresh, clean settings implementation.</p>
        <a href="/dashboard">Back to Dashboard</a>
    `);
});

module.exports = router;
