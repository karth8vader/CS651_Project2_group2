// routes/imageProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Proxy endpoint to fetch an image from Google Photos and return it as base64
 * This avoids CORS issues when trying to fetch directly from the frontend
 */
router.post('/fetch', async (req, res) => {
    const { imageUrl, accessToken } = req.body;

    if (!imageUrl || !accessToken) {
        return res.status(400).json({ 
            error: 'Missing required parameters', 
            success: false 
        });
    }

    try {
        console.log('🟢 Fetching image from Google Photos via proxy');
        
        // First attempt with the original URL
        try {
            const response = await axios.get(imageUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                responseType: 'arraybuffer'
            });
            
            // Convert the image to base64
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');
            
            return res.json({
                success: true,
                imageData: base64Image
            });
        } catch (firstError) {
            console.log('🟡 First attempt failed, trying with simplified URL');
            
            // If first attempt fails, try with a simplified URL (removing query parameters)
            const simplifiedUrl = imageUrl.split('?')[0];
            
            const response = await axios.get(simplifiedUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                responseType: 'arraybuffer'
            });
            
            // Convert the image to base64
            const base64Image = Buffer.from(response.data, 'binary').toString('base64');
            
            return res.json({
                success: true,
                imageData: base64Image
            });
        }
    } catch (error) {
        console.error('🔴 Error fetching image:', error.message);
        
        // Provide detailed error information for debugging
        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText
        };
        
        res.status(500).json({ 
            error: 'Failed to fetch image', 
            details: errorDetails,
            success: false 
        });
    }
});

module.exports = router;