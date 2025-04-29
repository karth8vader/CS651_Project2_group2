/**
 * Gemini API Router
 * 
 * This module provides routes for interacting with Google's Gemini AI models.
 * It handles recipe generation, restaurant recommendations, and image generation
 * based on user inputs and images.
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenAI } = require('@google/genai');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const sharp = require('sharp');
const { logToCloud } = require('../utils/logger');
require('dotenv').config();

// Google Cloud project configuration
const project = 'picplate-login-app';
const location = 'us-central1';

// AI service client instances
let vertexAI;        // For accessing Vertex AI services
let recipeModel;     // Specific Gemini model for recipe generation
let genAI;           // For accessing Gemini API directly
let visionClient;    // For accessing Vision API

// Path to the service account key file for Gemini API
const keyFile = path.join(__dirname, '../gemini-key.json');

// Initialize AI services if the key file exists
if (fs.existsSync(keyFile)) {
    try {
        // Initialize VertexAI for recipe generation using Gemini 2.0 Flash model
        // This model is optimized for fast text generation with good quality
        vertexAI = new VertexAI({ project, location });
        recipeModel = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Initialize GoogleGenAI SDK for image generation
        // This uses the API key from environment variables
        const apiKey = process.env.GEMINI_API_KEY;
        genAI = new GoogleGenAI({apiKey});

        // Initialize Vision API client for image analysis and face detection
        const visionKeyFile = path.resolve(__dirname, '../picplate-service-account.json');
        if (fs.existsSync(visionKeyFile)) {
            visionClient = new ImageAnnotatorClient({
                keyFilename: visionKeyFile
            });
        } else {
            console.error('❌ Vision API service account key file not found at:', visionKeyFile);
        }
    } catch (error) {
        console.error('❌ Error initializing AI models:', error);
    }
} else {
    console.error('❌ Service account key file not found at:', keyFile);
}

/**
 * Detects faces in an image and draws black boxes over them for privacy
 * 
 * @param {Buffer} imageBuffer - The raw image data as a buffer
 * @returns {Promise<Buffer>} - Promise resolving to the processed image buffer with faces obscured
 * 
 * This utility function uses Google's Vision API to detect faces in the provided image,
 * then uses the Sharp library to draw black rectangles over each detected face.
 * This is used for privacy protection before processing images with Gemini AI.
 * If no faces are detected or if an error occurs, the original image is returned.
 */
async function processImageForFaces(imageBuffer) {
    try {
        // Convert buffer to base64 for Vision API request
        const base64Image = imageBuffer.toString('base64');

        // Detect faces using Vision API's faceDetection method
        const [result] = await visionClient.faceDetection({
            image: { content: base64Image }
        });

        // Extract face annotations from the result, defaulting to empty array if none
        const faces = result.faceAnnotations || [];

        // If no faces detected, return the original image unchanged
        if (faces.length === 0) {
            return imageBuffer;
        }

        // Initialize Sharp with the original image for processing
        let sharpImage = sharp(imageBuffer);

        // Get image dimensions to create properly sized SVG overlay
        const metadata = await sharpImage.metadata();

        // Create SVG rectangles for each detected face
        let svgRectangles = '';
        faces.forEach(face => {
            // Only process faces with valid bounding polygon data
            if (face.boundingPoly && face.boundingPoly.vertices) {
                const vertices = face.boundingPoly.vertices;

                // Calculate rectangle coordinates from the vertices
                // Using min/max to handle any vertex order
                const minX = Math.min(...vertices.map(v => v.x || 0));
                const minY = Math.min(...vertices.map(v => v.y || 0));
                const maxX = Math.max(...vertices.map(v => v.x || 0));
                const maxY = Math.max(...vertices.map(v => v.y || 0));

                const width = maxX - minX;
                const height = maxY - minY;

                // Add a black rectangle to the SVG for this face
                svgRectangles += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="black" />`;
            }
        });

        // Create complete SVG with all face rectangles
        const svg = `<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">${svgRectangles}</svg>`;

        // Overlay the SVG on top of the original image
        const processedImageBuffer = await sharpImage
            .composite([{
                input: Buffer.from(svg),
                top: 0,
                left: 0
            }])
            .toBuffer();

        return processedImageBuffer;
    } catch (error) {
        console.error('❌ Error processing image for faces:', error);
        // Return original image if any error occurs during processing
        return imageBuffer;
    }
}

// 🚀 Recipe generation with optional image
router.post('/generate-recipe', async (req, res) => {
    const { labels, emotions, colors, useEmotions, useColors, imageUrl, temperature, imageBase64, processedImage } = req.body;

    //logging gemini request console
    await logToCloud({
        message: 'Incoming Gemini request - generate-recipe',
        route: '/api/gemini/generate-recipe',
        requestBody: { labels, emotions, colors, temperature },
        timestamp: new Date().toISOString()
    });

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

        recipePrompt += `\nSuggest a main course meal. The response should be structured in the style of a recipe. Start with a creative title for the meal. Then give a brief description of the meal and how it relates to the provided context. Then give the ingredients and steps for making the main dish, finally give brief suggestions for an appetizer, side, and dessert.  Use markdown.`;

        // Log the prompt being sent to Gemini
        console.log('🔍 Sending recipe prompt to Gemini:', recipePrompt);

        // Prepare parts for the Gemini request
        const parts = [{ text: recipePrompt }];

        // Use the processed image if provided, otherwise process the image if imageBase64 is provided
        if (processedImage) {
            // Use the already processed image from vision.js
            parts.push({
                inline_data: {
                    data: processedImage,
                    mimeType: 'image/jpeg'
                }
            });
            console.log('🖼️ Added pre-processed image to recipe prompt');
        } else if (imageBase64 && visionClient) {
            try {
                // Convert base64 to buffer
                const imageBuffer = Buffer.from(imageBase64, 'base64');

                // Process image to detect and cover faces
                const processedImageBuffer = await processImageForFaces(imageBuffer);

                // Convert processed image back to base64
                const processedImageBase64 = processedImageBuffer.toString('base64');

                // Add image to parts
                parts.push({
                    inline_data: {
                        data: processedImageBase64,
                        mimeType: 'image/jpeg' // Adjust mime type if needed
                    }
                });

                console.log('🖼️ Added processed image to recipe prompt');
            } catch (imageError) {
                console.error('❌ Error processing image for recipe:', imageError);
                // Continue without image if processing fails
            }
        }

        const recipeResult = await recipeModel.generateContent({
            contents: [{ role: 'user', parts: parts }],
            generationConfig: { 
                temperature: temperature || 1.0, 
                maxOutputTokens: 2048 
            }
        });

        const recipeResponse = await recipeResult.response;
        const recipeText = recipeResponse?.candidates?.[0]?.content?.parts?.[0]?.text || 'No recipe generated.';

        //logging gemini response cloud console
        await logToCloud({
            message: 'Gemini recipe generated successfully',
            responsePreview: recipeResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 100) || 'No recipe generated',
            timestamp: new Date().toISOString()
        });
        res.json({ recipe: recipeText }); // 🚀 Only recipe returned
    } catch (err) {
        console.error('❌ Gemini API error:', err);
        //logging error for generate-recipe
        await logToCloud({
            message: 'Gemini generate-recipe failed',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            error: `Failed to generate suggestion: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

// 🚀 Generate restaurant suggestions with optional image
router.post('/generate-restaurants', async (req, res) => {
    const { dishName, userLocation, imageBase64, processedImage } = req.body;

    //logging gemini request for restaurant
    await logToCloud({
        message: 'Incoming Gemini request - generate-restaurants',
        route: '/api/gemini/generate-restaurants',
        requestBody: { dishName, userLocation },
        timestamp: new Date().toISOString()
    });
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
        const prompt = `Suggest 3 restaurants that are in the area of this zip code: ${userLocation}. They should serve food such as the food in this recipe: "${dishName.replace(/[#>*`\-]/g, '').slice(0, 400)}".\nEach suggestion should be:\n- **Restaurant Name**\n- One sentence summary why it's a match\n- Include website link if available.\nUse markdown.`;

        // Log the prompt being sent to Gemini
        console.log('🔍 Sending restaurant prompt to Gemini:', prompt);

        // Prepare parts for the Gemini request
        const parts = [{ text: prompt }];

        // Use the processed image if provided, otherwise process the image if imageBase64 is provided
        if (processedImage) {
            // Use the already processed image from vision.js
            parts.push({
                inline_data: {
                    data: processedImage,
                    mimeType: 'image/jpeg'
                }
            });
            console.log('🖼️ Added pre-processed image to restaurant prompt');
        } else if (imageBase64 && visionClient) {
            try {
                // Convert base64 to buffer
                const imageBuffer = Buffer.from(imageBase64, 'base64');

                // Process image to detect and cover faces
                const processedImageBuffer = await processImageForFaces(imageBuffer);

                // Convert processed image back to base64
                const processedImageBase64 = processedImageBuffer.toString('base64');

                // Add image to parts
                parts.push({
                    inline_data: {
                        data: processedImageBase64,
                        mimeType: 'image/jpeg' // Adjust mime type if needed
                    }
                });

                console.log('🖼️ Added processed image to restaurant prompt');
            } catch (imageError) {
                console.error('❌ Error processing image for restaurant suggestions:', imageError);
                // Continue without image if processing fails
            }
        }

        const result = await recipeModel.generateContent({
            contents: [{ role: 'user', parts: parts }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
        });

        const response = await result.response;
        //gemini response restaurant
        await logToCloud({
            message: 'Gemini restaurant suggestions generated successfully',
            responsePreview: response?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 100) || 'No restaurants generated',
            timestamp: new Date().toISOString()
        });
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No restaurant suggestions generated.';

        res.json({ restaurants: text });
    } catch (err) {
        console.error('❌ Gemini API error (restaurant generation):', err);
        //gemini error restaurant
        await logToCloud({
            message: 'Gemini generate-restaurants failed',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            error: `Failed to generate restaurant suggestions: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

// 🖼️ Generate images based on recipe text
router.post('/generate-images', async (req, res) => {
    const { recipeText } = req.body;

    //gemini request image
    await logToCloud({
        message: 'Incoming Gemini request - generate-images',
        route: '/api/gemini/generate-images',
        requestBody: { recipeText },
        timestamp: new Date().toISOString()
    });
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

        //gemini response image
        await logToCloud({
            message: 'Gemini images generated successfully',
            imageCount: response.generatedImages.length || 0,
            timestamp: new Date().toISOString()
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
        //gemini error image
        await logToCloud({
            message: 'Gemini generate-images failed',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            error: `Failed to generate images: ${err.message}`,
            details: err.response?.data || err.stack
        });
    }
});

module.exports = router;
