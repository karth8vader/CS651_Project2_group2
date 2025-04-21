// routes/photos.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken || accessToken === 'dummy-token') {
        console.log('🟡 No valid Google access token, skipping Google Photos fetch.');
        return res.status(200).json({ photos: [] }); // 👈 avoid 500
    }

    try {
        const response = await axios.get('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=20', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const items = response.data.mediaItems || [];
        res.json({ photos: items });
    } catch (error) {
        console.error('🔴 Error fetching Google Photos:', error.message);
        res.status(500).json({ error: 'Failed to fetch Google Photos' });
    }
});

module.exports = router;
