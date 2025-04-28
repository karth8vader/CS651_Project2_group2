const express = require('express');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const router = express.Router();

// ✅ Adjust this path if needed to point to your correct service account key
const vision = new ImageAnnotatorClient({
    keyFilename: path.resolve(__dirname, '../picplate-service-account.json')
});

// Utility function to process image: detect faces and draw black boxes over them
async function processImageForFaces(imageBuffer, faces) {
    try {
        // If no faces detected, return the original image
        if (!faces || faces.length === 0) {
            return imageBuffer;
        }

        // Process image with Sharp to draw black boxes over faces
        let sharpImage = sharp(imageBuffer);

        // Get image metadata to create SVG with proper dimensions
        const metadata = await sharpImage.metadata();

        // Create SVG with rectangles for each face
        let svgRectangles = '';
        faces.forEach(face => {
            if (face.boundingPoly && face.boundingPoly.vertices) {
                const vertices = face.boundingPoly.vertices;

                // Calculate rectangle coordinates
                const minX = Math.min(...vertices.map(v => v.x || 0));
                const minY = Math.min(...vertices.map(v => v.y || 0));
                const maxX = Math.max(...vertices.map(v => v.x || 0));
                const maxY = Math.max(...vertices.map(v => v.y || 0));

                const width = maxX - minX;
                const height = maxY - minY;

                // Add rectangle to SVG
                svgRectangles += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="black" />`;
            }
        });

        // Create complete SVG
        const svg = `<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">${svgRectangles}</svg>`;

        // Composite the SVG over the original image
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
        // Return original image if processing fails
        return imageBuffer;
    }
}

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

        // Process image to censor faces
        const processedImageBuffer = await processImageForFaces(imageBuffer, faces);

        // Convert processed image to base64 for response
        const processedImageBase64 = processedImageBuffer.toString('base64');

        // Send all data including boundingPolys and processed image
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
            labelDescriptions: labels.map(label => label.description),
            // Include processed image with faces censored
            processedImage: processedImageBase64
        });

    } catch (err) {
        console.log('🔍 Received imageUrl:', imageUrl);
        console.error('Vision API error:', err);
        res.status(500).json({ error: 'Failed to analyze image' });
    }

});

module.exports = router;
