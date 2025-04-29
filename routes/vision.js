/**
 * Vision API Router
 * 
 * This module provides routes for interacting with Google's Vision API.
 * It handles image analysis including label detection, face detection,
 * and image property extraction. It also processes images to protect privacy
 * by obscuring detected faces.
 */
const express = require('express');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const router = express.Router();
const { logToCloud } = require('../utils/logger');

// Initialize the Vision API client with service account credentials
// The service account key provides authentication for Google Cloud APIs
const vision = new ImageAnnotatorClient({
    keyFilename: path.resolve(__dirname, '../picplate-service-account.json')
});

/**
 * Draws black boxes over detected faces in an image for privacy protection
 * 
 * @param {Buffer} imageBuffer - The raw image data as a buffer
 * @param {Array} faces - Array of face objects from Vision API with boundingPoly data
 * @returns {Promise<Buffer>} - Promise resolving to the processed image buffer with faces obscured
 * 
 * Unlike the version in gemini.js, this function receives pre-detected faces rather than
 * performing face detection itself. It uses Sharp to overlay black rectangles on the
 * image at the positions of the detected faces.
 */
async function processImageForFaces(imageBuffer, faces) {
    try {
        // If no faces provided or array is empty, return the original image unchanged
        if (!faces || faces.length === 0) {
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

/**
 * POST / - Analyze an image using Google Vision API
 * 
 * Processes an image from Google Photos, detects objects, faces, colors, and text,
 * and returns structured analysis data. Also returns a privacy-protected version
 * of the image with faces obscured.
 * 
 * @route POST /api/vision
 * @param {string} req.body.imageUrl - URL of the image in Google Photos
 * @param {string} req.body.accessToken - Google OAuth access token
 * @returns {Object} JSON with analysis results and processed image
 */
router.post('/', async (req, res) => {
    const { imageUrl, accessToken } = req.body;

    // Validate required parameters
    if (!imageUrl || !accessToken) {
        return res.status(400).json({ error: 'Image URL and access token are required' });
    }

    try {
        // Log incoming request
        await logToCloud({
            message: 'Vision API request received',
            imageUrl,
            timestamp: new Date().toISOString()
        });
        // Download image from Google Photos using the provided access token
        // The arraybuffer responseType ensures we get binary data
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const base64Image = imageBuffer.toString('base64');

        // Analyze the image using Vision API with multiple feature detections
        const [result] = await vision.annotateImage({
            image: { content: base64Image },
            features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },  // Detect objects and scenes
                { type: 'FACE_DETECTION', maxResults: 5 },    // Detect faces and emotions
                { type: 'IMAGE_PROPERTIES', maxResults: 5 }   // Extract color information
            ],
        });

        // Log the full response for debugging purposes
        console.dir(result, { depth: null });

        // Extract and structure label data with bounding polygons
        const labels = result.labelAnnotations?.map(label => ({
            description: label.description,
            boundingPoly: label.boundingPoly
        })) || [];

        // Extract dominant colors from the image
        const colors = result.imagePropertiesAnnotation?.dominantColors?.colors.map(c => c.color) || [];

        // Process face data to extract emotions and bounding polygons
        const faces = result.faceAnnotations || [];
        let emotions = [];
        let faceBoundingPolys = [];

        if (faces.length > 0) {
            faces.forEach(face => {
                // Extract emotions with sufficient likelihood
                const faceEmotions = [];
                const possibleEmotions = ['joy', 'sorrow', 'anger', 'surprise'];
                possibleEmotions.forEach(emotion => {
                    const likelihood = face[`${emotion}Likelihood`];
                    // Only include emotions that are at least "POSSIBLE"
                    if (['VERY_LIKELY', 'LIKELY', 'POSSIBLE'].includes(likelihood)) {
                        faceEmotions.push(emotion);
                    }
                });

                // Add detected emotions to the overall emotions array
                if (faceEmotions.length > 0) {
                    emotions = emotions.concat(faceEmotions);
                }

                // Store face bounding polygons for UI visualization
                if (face.boundingPoly) {
                    faceBoundingPolys.push(face.boundingPoly);
                }
            });
        }

        // Extract text annotations with their bounding polygons
        const textBoundingPolys = result.textAnnotations?.map(text => ({
            description: text.description,
            boundingPoly: text.boundingPoly
        })) || [];

        // Process the image to censor faces for privacy protection
        const processedImageBuffer = await processImageForFaces(imageBuffer, faces);

        // Convert the processed image back to base64 for the response
        const processedImageBase64 = processedImageBuffer.toString('base64');

        // After successful analysis
        await logToCloud({
            message: 'Vision API analysis completed',
            labelsDetected: labels.map(label => label.description),
            emotionsDetected: emotions,
            colorsDetected: colors.length,
            timestamp: new Date().toISOString()
        });

        // Send a comprehensive response with all analysis data
        res.json({ 
            labels,  // Objects and scenes with bounding polygons
            colors,  // Dominant colors in the image
            emotions,  // Detected emotions from faces
            // Structured bounding polygon data for UI visualization
            boundingPolys: {
                faces: faceBoundingPolys,
                labels: labels.filter(label => label.boundingPoly).map(label => ({
                    description: label.description,
                    boundingPoly: label.boundingPoly
                })),
                text: textBoundingPolys
            },
            // Simple label descriptions for backward compatibility
            labelDescriptions: labels.map(label => label.description),
            // Privacy-protected version of the image
            processedImage: processedImageBase64
        });

    } catch (err) {
        // Log error details for debugging
        console.log('🔍 Received imageUrl:', imageUrl);
        console.error('Vision API error:', err);
        await logToCloud({
            message: 'Vision API error',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

module.exports = router;
