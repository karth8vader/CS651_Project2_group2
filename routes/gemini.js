const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { VertexAI } = require('@google-cloud/vertexai');


const project = 'picplate-login-app';
const location = 'us-central1';

let vertexAI;
let model;

// Load service account key
const keyFile = path.join(__dirname, '../gemini-key.json');

if (fs.existsSync(keyFile)) {

    try {
        vertexAI = new VertexAI({
            project,
            location,
            keyFilename: keyFile
        });

        model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    } catch (error) {
        console.error('❌ Error initializing VertexAI or model:', error);
    }
} else {
    console.error('❌ Service account key file not found at:', keyFile);
}

router.post('/generate-recipe', async (req, res) => {
    const { labels, emotions, colors, useEmotions, useColors } = req.body;


    if (!labels || !Array.isArray(labels)) {
        return res.status(400).json({ error: 'Labels are required for generation.' });
    }

    if (!model) {
        console.error('❌ Gemini model not initialized');
        return res.status(500).json({
            error: 'Gemini API not available. Please check server logs for details.',
            details: 'Model initialization failed.'
        });
    }

    try {
        // ✅ Format label descriptions safely
        const labelTexts = labels.map(l =>
            typeof l === 'string' ? l : l.description || JSON.stringify(l)
        );

        // 🧠 Compose dynamic prompt
        let prompt = `Based on the image analysis, the labels detected are: ${labelTexts.join(', ')}.`;

        if (useEmotions && emotions?.length > 0) {
            prompt += ` The user is currently feeling: ${emotions.join(', ')}.`;
        }

        if (useColors && colors?.length > 0) {
            const hexColors = colors.map(c => `rgb(${c.red},${c.green},${c.blue})`);
            prompt += ` The dominant colors in the photo are: ${hexColors.join(', ')}.`;
        }

        prompt += `\nBased on the above information, suggest a personalized meal or dish.`;



        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const response = await result.response;
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions generated.';


        res.json({ recipe: text });
    } catch (err) {
        console.error('❌ Gemini API error:', err);
        res.status(500).json({
            error: `Failed to generate suggestion: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

module.exports = router;