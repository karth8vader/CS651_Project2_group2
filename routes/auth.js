// routes/auth.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');


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

        res.json({ user: userInfo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to authenticate user' });
    }
});

module.exports = router;
