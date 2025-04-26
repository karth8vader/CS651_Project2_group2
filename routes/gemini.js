// routes/gemini.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { VertexAI } = require('@google-cloud/vertexai');

const project = 'picplate-login-app';
const location = 'us-central1';

let vertexAI;
let recipeModel;
let imageModel;

const keyFile = path.join(__dirname, '../gemini-key.json');

if (fs.existsSync(keyFile)) {
    try {
        vertexAI = new VertexAI({ project, location, keyFilename: keyFile });
        recipeModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        imageModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
        console.error('❌ Error initializing VertexAI or models:', error);
    }
} else {
    console.error('❌ Service account key file not found at:', keyFile);
}

router.post('/generate-recipe', async (req, res) => {
    const { labels, emotions, colors, useEmotions, useColors, imageUrl } = req.body;

    if (!labels || !Array.isArray(labels)) {
        return res.status(400).json({ error: 'Labels are required for generation.' });
    }

    if (!recipeModel || !imageModel) {
        return res.status(500).json({
            error: 'Gemini or Imagen model not available. Please check server logs for details.',
            details: 'Model initialization failed.'
        });
    }

    try {
        const labelTexts = labels.map(l => typeof l === 'string' ? l : l.description || JSON.stringify(l));

        let recipePrompt = `You are a creative 5-star chef. Based on the following context:
- Labels: ${labelTexts.join(', ')}`;

        if (useEmotions && emotions?.length > 0) {
            recipePrompt += `\n- Emotions: ${emotions.join(', ')}`;
        }
        if (useColors && colors?.length > 0) {
            const hexColors = colors.map(c => `rgb(${c.red},${c.green},${c.blue})`);
            recipePrompt += `\n- Colors: ${hexColors.join(', ')}`;
        }

        recipePrompt += `\nSuggest a tropical 3-course meal. Focus only on one main course recipe (with ingredients and steps), and give short summaries for appetizer and dessert.`;

        const recipeResult = await recipeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: recipePrompt }] }],
            generationConfig: { temperature: 1.0, maxOutputTokens: 2048 }
        });

        const recipeResponse = await recipeResult.response;
        const recipeText = recipeResponse?.candidates?.[0]?.content?.parts?.[0]?.text || 'No recipe generated.';

        // Extract main course name from recipeText for image prompt
        const mainCourseMatch = recipeText.match(/Main Course:\s*(.+)/i);
        const mainCourseName = mainCourseMatch ? mainCourseMatch[1].split('\n')[0] : 'Tropical Dish';


        const imagePrompt = `Please generate the image of dish called "${mainCourseName}".`;

        const imageResult = await imageModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        });

        const imageResponse = await imageResult.response;
        const imagePart = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        const imageBase64 = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null;

        res.json({ recipe: recipeText, image: imageBase64 });
    } catch (err) {
        console.error('❌ Gemini API error:', err);
        res.status(500).json({
            error: `Failed to generate suggestion: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

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
        const prompt = `Suggest 3 restaurants in ${userLocation} that serve food like this: "${dishName.replace(/[#>*`\-]/g, '').slice(0, 400)}".\nEach suggestion should be:\n- **Restaurant Name**\n- One sentence summary why it's a match\n- Include website link if available.\nUse markdown.`;

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

module.exports = router;
