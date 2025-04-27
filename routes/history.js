// routes/history.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');

// Save history for a user
router.post('/save', async (req, res) => {
    const { email, photoUrl, recipePrompt, restaurantPrompt } = req.body;

    if (!email || !recipePrompt || !restaurantPrompt) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const historyRef = admin.firestore()
            .collection('users')
            .doc(email)
            .collection('history');

        const doc = await historyRef.add({
            photoUrl: photoUrl || '', // optional, may be empty
            recipePrompt,
            restaurantPrompt,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ message: 'History saved successfully.', id: doc.id });
    } catch (error) {
        console.error('Error saving history:', error);
        res.status(500).json({ error: 'Failed to save history.' });
    }
});

// Fetch history for a user
router.post('/get', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email.' });
    }

    try {
        const historySnapshot = await admin.firestore()
            .collection('users')
            .doc(email)
            .collection('history')
            .orderBy('timestamp', 'desc')
            .get();

        const history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

// Delete a history record
router.delete('/delete/:email/:historyId', async (req, res) => {
    const { email, historyId } = req.params;

    if (!email || !historyId) {
        return res.status(400).json({ error: 'Missing email or history ID.' });
    }

    try {
        await admin.firestore()
            .collection('users')
            .doc(email)
            .collection('history')
            .doc(historyId)
            .delete();

        res.json({ message: 'History entry deleted successfully.' });
    } catch (error) {
        console.error('Error deleting history:', error);
        res.status(500).json({ error: 'Failed to delete history.' });
    }
});

module.exports = router;
