// routes/gemini.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const project = 'picplate-login-app';
const location = 'us-central1';

let vertexAI;
let recipeModel;
let genAI;

const keyFile = path.join(__dirname, '../gemini-key.json');

if (fs.existsSync(keyFile)) {
    try {
        // Initialize VertexAI for recipe generation
        vertexAI = new VertexAI({ project, location });
        recipeModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Initialize GoogleGenAI for image generation using API key from .env file
        const apiKey = process.env.GEMINI_API_KEY;
        genAI = new GoogleGenAI({apiKey});
    } catch (error) {
        console.error('❌ Error initializing AI models:', error);
    }
} else {
    console.error('❌ Service account key file not found at:', keyFile);
}

// 🚀 Only recipe generation now
router.post('/generate-recipe', async (req, res) => {
    const { labels, emotions, colors, useEmotions, useColors, imageUrl, temperature } = req.body;

    if (!labels || !Array.isArray(labels)) {
        return res.status(400).json({ error: 'Labels are required for generation.' });
    }

    if (!recipeModel) {
        return res.status(500).json({
            error: 'Gemini model not available. Please check server logs for details.',
            details: 'Model initialization failed.'
        });
    }

    try {
        const labelTexts = labels.map(l => typeof l === 'string' ? l : l.description || JSON.stringify(l));

        let recipePrompt = `You are a creative home cook. Based on the following context:
- Labels: ${labelTexts.join(', ')}`;

        if (useEmotions && emotions?.length > 0) {
            recipePrompt += `\n- Emotions: ${emotions.join(', ')}`;
        }
        if (useColors && colors?.length > 0) {
            const hexColors = colors.map(c => `rgb(${c.red},${c.green},${c.blue})`);
            recipePrompt += `\n- Colors: ${hexColors.join(', ')}`;
        }

        recipePrompt += `\nSuggest a main course meal. The response should be structured in the style of a recipe. Start with a creative title for the meal. Then give a brief description of the meal and how it relates to the provided context. Then give the ingredients and step for making the main dish, finally give brief suggestions for an appetizer, side, and dessert.  Use markdown.`;

        // Log the prompt being sent to Gemini
        console.log('🔍 Sending recipe prompt to Gemini:', recipePrompt);

        const recipeResult = await recipeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: recipePrompt }] }],
            generationConfig: { 
                temperature: temperature || 1.0, 
                maxOutputTokens: 2048 
            }
        });

        const recipeResponse = await recipeResult.response;
        const recipeText = recipeResponse?.candidates?.[0]?.content?.parts?.[0]?.text || 'No recipe generated.';

        res.json({ recipe: recipeText }); // 🚀 Only recipe returned
    } catch (err) {
        console.error('❌ Gemini API error:', err);
        res.status(500).json({
            error: `Failed to generate suggestion: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

// 🚀 No changes to /generate-restaurants, keep it same
router.post('/generate-restaurants', async (req, res) => {
    const { dishName, userLocation } = req.body;

    if (!dishName || !userLocation) {
        return res.status(400).json({ error: 'Dish name and user location are required.' });
    }

    if (!recipeModel) {
        return res.status(500).json({
            error: 'Gemini Text model not available. Please check server logs for details.',
            details: 'Model initialization failed.'
        });
    }

    try {
        const prompt = `Suggest 3 restaurants in the zip code ${userLocation} that serve food like this: "${dishName.replace(/[#>*`\-]/g, '').slice(0, 400)}".\nEach suggestion should be:\n- **Restaurant Name**\n- One sentence summary why it's a match\n- Include website link if available.\nUse markdown.`;

        // Log the prompt being sent to Gemini
        console.log('🔍 Sending restaurant prompt to Gemini:', prompt);

        const result = await recipeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
        });

        const response = await result.response;
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No restaurant suggestions generated.';

        res.json({ restaurants: text });
    } catch (err) {
        console.error('❌ Gemini API error (restaurant generation):', err);
        res.status(500).json({
            error: `Failed to generate restaurant suggestions: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

// 🖼️ Generate images based on recipe text
router.post('/generate-images', async (req, res) => {
    const { recipeText } = req.body;

    if (!recipeText) {
        return res.status(400).json({ error: 'Recipe text is required for image generation.' });
    }

    if (!genAI) {
        return res.status(500).json({
            error: 'Image generation model not available. Please check server logs for details.',
            details: 'Model initialization failed.'
        });
    }

    try {
        // Create a prompt for food image generation based on the recipe
        const prompt = `Create a beautiful, appetizing food photograph of a dish based on this recipe: ${recipeText.substring(0, 500)}. Make it look professional, well-lit, and mouth-watering.`;

        // Log the prompt being sent to Gemini
        console.log('🔍 Sending image generation prompt to Gemini:', prompt);

        // Generate 4 images using the new method
        const response = await genAI.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 4,
            },
        });

        // Extract image data from the response
        const images = [];
        let idx = 0;
        for (const generatedImage of response.generatedImages) {
            let imgBytes = generatedImage.image.imageBytes;
            // Convert to base64 for frontend display
            images.push({
                mimeType: 'image/png', // Default mime type for generated images
                data: imgBytes  // Base64 encoded image data
            });
            idx++;
        }

        res.json({ images });
    } catch (err) {
        console.error('❌ Image generation API error:', err);
        res.status(500).json({
            error: `Failed to generate images: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

module.exports = router;
