// routes/auth.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');
const { logToCloud } = require('../utils/logger');


// Save Google user login
router.post('/login', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Missing token' });

    try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        }).then(res => res.json());

        const docRef = admin.firestore().collection('users').doc(userInfo.email);
        await docRef.set(userInfo, { merge: true });
        await logToCloud({  // 👈 Added logging after success
            message: 'User authenticated successfully',
            email: userInfo.email,
            name: userInfo.name || userInfo.given_name || '',
            timestamp: new Date().toISOString()
        });

        res.json({ user: userInfo });
    } catch (err) {
        console.error(err);
        await logToCloud({  // 👈 Added logging on error
            message: 'Failed to authenticate user',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Failed to authenticate user' });
    }
});

module.exports = router;
