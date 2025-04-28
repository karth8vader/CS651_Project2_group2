// routes/history.js
const express = require('express');
const router = express.Router();
const admin = require('../firebase');

// Save history for a user
router.post('/save', async (req, res) => {
    const { email, photoUrl, photoId, recipePrompt, restaurantPrompt, imageData } = req.body;

    if (!email || !recipePrompt || !restaurantPrompt) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        let imageUrl = photoUrl || '';

        // If we have image data, upload it to Cloud Storage
        if (imageData) {
            try {
                // Get a reference to the storage bucket
                const bucket = admin.storage().bucket();

                // Create a unique filename
                const filename = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;

                // Create a buffer from the base64 image data
                const imageBuffer = Buffer.from(imageData, 'base64');

                // Create a file reference
                const file = bucket.file(filename);

                // Upload the image
                await file.save(imageBuffer, {
                    metadata: {
                        contentType: 'image/png'
                    }
                });

                // Make the file publicly accessible
                await file.makePublic();

                // Get the public URL
                imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

                console.log(`Uploaded image to: ${imageUrl}`);
            } catch (uploadError) {
                console.error('Error uploading image to Cloud Storage:', uploadError);
                // If upload fails, fall back to the original photo URL
                imageUrl = photoUrl || '';
            }
        }

        const historyRef = admin.firestore()
            .collection('users')
            .doc(email)
            .collection('history');

        const doc = await historyRef.add({
            photoUrl: imageUrl,
            photoId,
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
