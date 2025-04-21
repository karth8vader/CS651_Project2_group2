const express = require('express');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const path = require('path');
const axios = require('axios');
const router = express.Router();

// ✅ Adjust this path if needed to point to your correct service account key
const vision = new ImageAnnotatorClient({
    keyFilename: path.resolve(__dirname, '../picplate-service-account.json')
});

router.post('/', async (req, res) => {
    const { imageUrl, accessToken } = req.body;

    if (!imageUrl || !accessToken) {
        return res.status(400).json({ error: 'Image URL and access token are required' });
    }

    try {
        // Download image from Google Photos using an access token
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const base64Image = imageBuffer.toString('base64');

        // Annotate image using Vision API
        const [result] = await vision.annotateImage({
            image: { content: base64Image },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'FACE_DETECTION', maxResults: 5 },
                { type: 'IMAGE_PROPERTIES', maxResults: 5 }
            ],
        });

        console.dir(result, { depth: null }); // ✅ Log the full response for debugging

        // Extract labels with boundingPoly
        const labels = result.labelAnnotations?.map(label => ({
            description: label.description,
            boundingPoly: label.boundingPoly
        })) || [];

        // Extract colors
        const colors = result.imagePropertiesAnnotation?.dominantColors?.colors.map(c => c.color) || [];

        // Extract emotions and boundingPoly from faces
        const faces = result.faceAnnotations || [];
        let emotions = [];
        let faceBoundingPolys = [];

        if (faces.length > 0) {
            faces.forEach(face => {
                const faceEmotions = [];
                const possibleEmotions = ['joy', 'sorrow', 'anger', 'surprise'];
                possibleEmotions.forEach(emotion => {
                    const likelihood = face[`${emotion}Likelihood`];
                    if (['VERY_LIKELY', 'LIKELY', 'POSSIBLE'].includes(likelihood)) {
                        faceEmotions.push(emotion);
                    }
                });

                if (faceEmotions.length > 0) {
                    emotions = emotions.concat(faceEmotions);
                }

                if (face.boundingPoly) {
                    faceBoundingPolys.push(face.boundingPoly);
                }
            });
        }

        // Extract text annotations with boundingPoly if available
        const textBoundingPolys = result.textAnnotations?.map(text => ({
            description: text.description,
            boundingPoly: text.boundingPoly
        })) || [];

        // Send all data including boundingPolys
        res.json({ 
            labels, 
            colors, 
            emotions, 
            boundingPolys: {
                faces: faceBoundingPolys,
                labels: labels.filter(label => label.boundingPoly).map(label => ({
                    description: label.description,
                    boundingPoly: label.boundingPoly
                })),
                text: textBoundingPolys
            },
            // Include simple label descriptions for backward compatibility
            labelDescriptions: labels.map(label => label.description)
        });

    } catch (err) {
        console.log('🔍 Received imageUrl:', imageUrl);
        console.error('Vision API error:', err);
        res.status(500).json({ error: 'Failed to analyze image' });
    }

});

module.exports = router;
