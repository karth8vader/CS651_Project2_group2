// routes/history.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');
const { logToCloud } = require('../utils/logger');

// Save history for a user
router.post('/save', async (req, res) => {
    const { email, photoUrl, recipePrompt, restaurantPrompt, imageData } = req.body;

    if (!email || !recipePrompt || !restaurantPrompt) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Use photoUrl directly if imageData is not provided
        // Otherwise, we'll save the image data string directly to Firestore
        const photoToSave = imageData ? `data:image/png;base64,${imageData}` : (photoUrl || '');

        console.log(`Saving history with ${imageData ? 'image data string' : 'photo URL'}`);

        const historyRef = admin.firestore()
            .collection('users')
            .doc(email)
            .collection('history');

        const doc = await historyRef.add({
            photoUrl: photoToSave,
            recipePrompt,
            restaurantPrompt,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log successful history save
        await logToCloud({
            message: 'History entry saved',
            email: email,
            recipePromptPreview: recipePrompt?.slice(0, 100),
            timestamp: new Date().toISOString()
        });
        res.json({ message: 'History saved successfully.', id: doc.id });
    } catch (error) {
        console.error('Error saving history:', error);
        // Log error while saving history
        await logToCloud({
            message: 'Error saving history',
            email: email || 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
        });
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

        // Log successful fetch
        await logToCloud({
            message: 'History fetched',
            email: email,
            numberOfEntries: history.length,
            timestamp: new Date().toISOString()
        });
        res.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        // Log error while fetching history
        await logToCloud({
            message: 'Error fetching history',
            email: email || 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
        });
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

        // Log successful deletion
        await logToCloud({
            message: 'History entry deleted',
            email: email,
            historyId: historyId,
            timestamp: new Date().toISOString()
        });
        res.json({ message: 'History entry deleted successfully.' });
    } catch (error) {
        console.error('Error deleting history:', error);
        // Log error while deleting history
        await logToCloud({
            message: 'Error deleting history entry',
            email: email || 'unknown',
            historyId: historyId || 'unknown',
            error: error.message,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Failed to delete history.' });
    }
});

module.exports = router;
