// frontend/src/pages/Profile.js
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import Navbar from '../components/navbar';
import showdown from 'showdown';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';

Modal.setAppElement('#root');

// Use showdown library for markdown to HTML conversion
const markdownToHtml = (markdown) => {
    if (!markdown) return '';

    // Create showdown converter instance
    const converter = new showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        strikethrough: true,
        tasklists: true,
        openLinksInNewWindow: true
    });

    // Convert markdown to HTML
    return converter.makeHtml(markdown);
};

const Profile = () => {
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState(null);
    const [analysisResults, setAnalysisResults] = useState({});
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('photos');
    const [modalActiveTab, setModalActiveTab] = useState('analysis');
    const [selectedLabels, setSelectedLabels] = useState([]);
    const [selectedEmotions, setSelectedEmotions] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [userLocation, setUserLocation] = useState('');
    const [zipCodeError, setZipCodeError] = useState('');
    const [geminiOutput, setGeminiOutput] = useState('');
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
    const [restaurantOutput, setRestaurantOutput] = useState('');
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
    const [hasGeneratedRecipe, setHasGeneratedRecipe] = useState(false);
    const [hasGeneratedRestaurants, setHasGeneratedRestaurants] = useState(false);
    const [geminiImage, setGeminiImage] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [historyEntries, setHistoryEntries] = useState([]);
    const [historyTabLoading, setHistoryTabLoading] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    // New state variables for image generation
    const [generatedImages, setGeneratedImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [temperature, setTemperature] = useState(1.0);

    // Function to refresh user email from localStorage
    const refreshUserEmail = () => {
        // Try to get email from google_user first
        const googleUserItem = localStorage.getItem('google_user');
        try {
            const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;

            // If email exists in google_user, use it
            if (googleUser?.email) {
                setUserEmail(googleUser.email);
                console.log('User email refreshed from google_user:', googleUser.email);
                return googleUser.email;
            } 

            // If not found in google_user, try the user object from server
            const userItem = localStorage.getItem('user');
            const user = userItem && userItem !== 'undefined' ? JSON.parse(userItem) : null;

            if (user?.email) {
                setUserEmail(user.email);
                console.log('User email refreshed from user object:', user.email);
                return user.email;
            }

            console.warn('No user email found during refresh in either google_user or user objects');
            return null;
        } catch (e) {
            console.error('Error refreshing user email:', e);
            return null;
        }
    };


    const canvasRef = useRef(null);

    const URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const extractDishName = (markdown) => {
        const match = markdown.match(/Main Course:\s*(.+)/i);
        if (match) {
            return match[1].split('\n')[0];
        }

        // If "Main Course:" pattern is not found, try to extract the title from the first line
        const lines = markdown.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Look for a line that might be a title (non-empty, not starting with common markdown elements)
            if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-') && 
                !trimmedLine.startsWith('*') && !trimmedLine.startsWith('>')) {
                return trimmedLine;
            }
        }

        // If all else fails, return a default dish name
        return 'Recommended Dish';
    };

    // CSS for hover effect
    const styles = {
        imageContainer: {
            position: 'relative',
        },
        hoverOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '8px',
            opacity: 0,
            transition: 'opacity 0.3s',
        },
        photoWrapper: {
            textAlign: 'center',
            maxWidth: '220px',
            position: 'relative',
            cursor: 'pointer',
        },
        analyzeText: {
            fontSize: '18px',
            fontWeight: 'bold',
        }
    };

    // Add CSS to the document head
    useEffect(() => {
        // Create a style element
        const style = document.createElement('style');
        // Add the CSS rules
        style.innerHTML = `
            .photo-item:hover .hover-overlay {
                opacity: 1 !important;
            }
        `;
        // Append the style element to the head
        document.head.appendChild(style);

        // Clean up function to remove the style when component unmounts
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        // Refresh user email when component mounts
        refreshUserEmail();

        const googleUserItem = localStorage.getItem('google_user');
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
        const token = googleUser?.access_token || localStorage.getItem('google_access_token');

        const fetchPhotos = async () => {
            try {
                const response = await axios.post(`${URL}/api/photos`, { accessToken: token });
                setPhotos(response.data.photos || []);
            } catch (err) {
                console.error('Failed to fetch photos:', err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    toast.error('Session expired. Please login again.', { position: 'top-center' });
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }, 1500);
                } else {
                    setError('Failed to load Google Photos.');
                }
            }
        };

        fetchPhotos();
    }, []);


    const handleAnalyzePhoto = async (photoId, photoUrl) => {
        const googleUserItem = localStorage.getItem('google_user');
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
        const accessToken = googleUser?.access_token || localStorage.getItem('google_access_token');

        // Reset canvas if it exists
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        // Refresh user email when modal is opened
        refreshUserEmail();

        setSelectedPhoto({ id: photoId, url: photoUrl });
        setModalOpen(true);
        setModalActiveTab('analysis');
        setGeminiOutput('');
        setGeminiImage('');
        setHasGeneratedRecipe(false);
        setHasGeneratedRestaurants(false);
        setRestaurantOutput('');
        setTemperature(1.0); // Reset temperature to 1.0
        setProcessedImage(null); // Reset processed image
        setSelectedLabels([]); // Reset selected labels
        setSelectedEmotions([]); // Reset selected emotions
        setSelectedColors([]); // Reset selected colors

        try {
            const response = await axios.post(`${URL}/api/vision`, {
                imageUrl: photoUrl,
                accessToken
            });

            // Store the processed image from the vision API response
            if (response.data.processedImage) {
                setProcessedImage(response.data.processedImage);
            } else {
                setProcessedImage(null);
            }

            setAnalysisResults(prev => ({
                ...prev,
                [photoId]: response.data
            }));
        } catch (err) {
            console.error('Vision API error:', err);
            alert('Failed to analyze image');
        }
    };

    const selectedData = selectedPhoto ? analysisResults[selectedPhoto.id] : null;

    // Function to draw image and bounding boxes on canvas
    const drawImageAndBoxes = () => {
        if (!selectedPhoto || !selectedData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Set canvas dimensions to match the image
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw bounding boxes if available
            if (selectedData.boundingPolys) {
                ctx.fillStyle = 'black';

                // Draw boxes for faces
                if (selectedData.boundingPolys.faces) {
                    selectedData.boundingPolys.faces.forEach(poly => {
                        if (poly.vertices && poly.vertices.length >= 4) {
                            ctx.beginPath();
                            ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                            for (let i = 1; i < poly.vertices.length; i++) {
                                ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                            }
                            ctx.closePath();
                            ctx.fill();
                        }
                    });
                }

                // Draw boxes for labels
                if (selectedData.boundingPolys.labels) {
                    selectedData.boundingPolys.labels.forEach(item => {
                        const poly = item.boundingPoly;
                        if (poly && poly.vertices && poly.vertices.length >= 4) {
                            ctx.beginPath();
                            ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                            for (let i = 1; i < poly.vertices.length; i++) {
                                ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                            }
                            ctx.closePath();
                            ctx.fill();
                        }
                    });
                }

                // Draw boxes for text
                if (selectedData.boundingPolys.text) {
                    selectedData.boundingPolys.text.forEach(item => {
                        const poly = item.boundingPoly;
                        if (poly && poly.vertices && poly.vertices.length >= 4) {
                            ctx.beginPath();
                            ctx.moveTo(poly.vertices[0].x, poly.vertices[0].y);
                            for (let i = 1; i < poly.vertices.length; i++) {
                                ctx.lineTo(poly.vertices[i].x, poly.vertices[i].y);
                            }
                            ctx.closePath();
                            ctx.fill();
                        }
                    });
                }
            }
        };

        // Load the image
        img.src = `${selectedPhoto.url}=w400`;
    };

    // Effect to draw boxes when analysis results change
    useEffect(() => {
        drawImageAndBoxes();
    }, [selectedData]);

    useEffect(() => {
        if (activeTab === 'restaurants' && geminiOutput && userLocation && !hasGeneratedRestaurants) {
            // Validate zip code before triggering restaurant generation
            const zipCodeRegex = /^\d{5}$/;
            if (zipCodeRegex.test(userLocation)) {
                handleGeminiRestaurantRequest();
            } else if (userLocation) {
                // Only set error if there's some input but it's invalid
                setZipCodeError('Invalid zip code. Please enter a 5-digit zip code.');
            }
        }
    }, [userLocation]);

    const handleGeminiRecipeRequest = async (regenerate = false) => { // ✅ NEW FUNCTION
        if (!selectedData) return;

        // If regenerate is false and we already have a recipe, don't generate again
        if (!regenerate && hasGeneratedRecipe) return;

        setIsLoadingRecipe(true);

        // Refresh user email when generating a recipe
        refreshUserEmail();

        try {
            // Make sure the canvas has the censored image for display purposes
            // but we'll use the original image URL for the API call to avoid SecurityError
            drawImageAndBoxes();

            const response = await axios.post(`${URL}/api/gemini/generate-recipe`, {
                labels: selectedLabels.length > 0 ? selectedLabels : selectedData.labels,
                emotions: selectedEmotions.length > 0 ? selectedEmotions : [],
                colors: selectedColors.length > 0 ? selectedColors : [],
                imageUrl: selectedPhoto.url,
                temperature: temperature, // Add temperature parameter
                processedImage: processedImage // Pass the processed image from vision API
            });

            console.log('Received response from Gemini API:', response.data);
            setGeminiOutput(response.data.recipe || 'No response from Gemini.');
            setGeminiImage(response.data.image || '');
            setHasGeneratedRecipe(true);

            // Reset generated images when a new recipe is generated
            setGeneratedImages([]);
            setCurrentImageIndex(0);
        } catch (err) {
            console.error('Gemini API error:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response ? {
                    status: err.response.status,
                    data: err.response.data
                } : 'No response data'
            });

            let errorMessage = 'Failed to get recipe from Gemini.';
            if (err.response && err.response.data && err.response.data.error) {
                errorMessage += ` Error: ${err.response.data.error}`;
            } else if (err.message) {
                errorMessage += ` Error: ${err.message}`;
            }

            setGeminiOutput(errorMessage);
        } finally {
            setIsLoadingRecipe(false);
        }
    };

    // Function to handle image generation
    const handleGenerateImages = async () => {
        if (!geminiOutput) {
            toast.info('Please generate a recipe first', { position: 'top-center' });
            return;
        }

        setIsGeneratingImages(true);
        setGeneratedImages([]);

        try {
            const response = await axios.post(`${URL}/api/gemini/generate-images`, {
                recipeText: geminiOutput
            });

            console.log('Received image generation response:', response.data);

            if (response.data.images && response.data.images.length > 0) {
                setGeneratedImages(response.data.images);
                setCurrentImageIndex(0);
            } else {
                toast.warning('No images were generated', { position: 'top-center' });
            }
        } catch (err) {
            console.error('Image generation error:', err);
            toast.error('Failed to generate images', { position: 'top-center' });
        } finally {
            setIsGeneratingImages(false);
        }
    };


    const handleGeminiRestaurantRequest = async (e) => {
        if (e) {
            e.preventDefault();
        }

        if (!geminiOutput) {
            console.error('Cannot generate restaurants: recipe missing.');
            return;
        }

        const dishName = extractDishName(geminiOutput);

        // Validate zip code (5 digits)
        const zipCodeRegex = /^\d{5}$/;
        if (!zipCodeRegex.test(userLocation)) {
            console.warn('Invalid zip code format.');
            setZipCodeError('Invalid zip code. Please enter a 5-digit zip code.');
            return;
        }

        // Clear any previous error
        setZipCodeError('');

        setIsLoadingRestaurants(true);

        try {
            const response = await axios.post(`${URL}/api/gemini/generate-restaurants`, {
                dishName,
                userLocation,
                processedImage: processedImage // Pass the processed image from vision API
            });

            setRestaurantOutput(response.data.restaurants || 'No restaurant suggestions received.');
            setHasGeneratedRestaurants(true);
        } catch (err) {
            console.error('Gemini restaurant generation error:', err);
            setRestaurantOutput('Failed to get restaurant suggestions.');
        } finally {
            setIsLoadingRestaurants(false);
        }
    };


    // Function to resize and compress image
    const resizeAndCompressImage = async (base64Data, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            try {
                // Create an image element
                const img = new Image();
                img.onload = () => {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    // Create a canvas element
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    // Draw the image on the canvas
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert canvas to compressed base64 data
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                    // Remove the data URL prefix to get just the base64 data
                    const base64Data = compressedBase64.split(',')[1];

                    resolve(base64Data);
                };

                img.onerror = (error) => {
                    console.error('Error loading image for compression:', error);
                    reject(error);
                };

                // Set the source of the image
                img.src = `data:image/png;base64,${base64Data}`;
            } catch (error) {
                console.error('Error in image compression:', error);
                reject(error);
            }
        });
    };

    // Save history to backend
    const handleSaveHistory = async () => {
        const trimmedRecipe = (geminiOutput || '').trim();
        const trimmedRestaurants = (restaurantOutput || '').trim();

        // Try getting email from localStorage
        const googleUserItem = localStorage.getItem('google_user');
        const userItem = localStorage.getItem('user');

        let freshEmail = '';

        try {
            const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
            if (googleUser?.email) {
                freshEmail = googleUser.email;
            } else {
                const user = userItem && userItem !== 'undefined' ? JSON.parse(userItem) : null;
                if (user?.email) {
                    freshEmail = user.email;
                }
            }
        } catch (err) {
            console.error('Error parsing localStorage for email:', err);
        }

        if (!freshEmail) {
            console.error('No user email found in localStorage.');
            toast.error('Login expired. Please login again.', { position: 'top-center' });
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/';
            }, 1500);
            return;
        }

        console.log('Attempting to save with email:', freshEmail);

        if (!trimmedRecipe || trimmedRecipe === 'No response from Gemini.') {
            toast.info('Please generate a recipe before saving.', { position: 'top-center' });
            return;
        }

        try {
            // Determine which image to upload
            let imageData = null;
            let photoUrl = selectedPhoto?.url || '';

            // If we have generated images, use the currently displayed one
            if (generatedImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < generatedImages.length) {
                console.log('Using generated image for upload');
                // Resize and compress the image before sending
                try {
                    imageData = await resizeAndCompressImage(generatedImages[currentImageIndex].data);
                    console.log('Image compressed successfully');
                } catch (compressionError) {
                    console.error('Error compressing image:', compressionError);
                    // Fallback to original image data if compression fails
                    imageData = generatedImages[currentImageIndex].data;
                }
            } else {
                console.log('No generated images, using original photo URL');
            }

            const response = await axios.post(`${URL}/api/history/save`, {
                email: freshEmail,
                recipePrompt: trimmedRecipe,
                restaurantPrompt: trimmedRestaurants || 'No restaurant suggestions available.',
                photoUrl: photoUrl,
                imageData: imageData
            });

            console.log('Save history response:', response.data);
            toast.success('Saved successfully!', { position: 'top-center' });
            setModalOpen(false);
            setTemperature(1.0); // Reset temperature when modal is closed
            setProcessedImage(null); // Reset processed image when modal is closed
            setUserLocation(''); // Clear zip code field when modal is closed
            setZipCodeError(''); // Clear any zip code errors
            setActiveTab('photos');

            fetchHistoryEntries();
        } catch (err) {
            console.error('Save history error:', err);
            let errorMessage = 'Failed to save history.';
            if (err.response?.data?.error) {
                errorMessage += ` Error: ${err.response.data.error}`;
            }
            toast.error(errorMessage, { position: 'top-center' });

            // ❌ Don't force logout if save failed!
        }
    };











// Fetch user's saved history
    const fetchHistoryEntries = async () => {
        // Use the current userEmail from state, which should be refreshed before this function is called
        if (!userEmail) {
            console.warn('Cannot fetch history: No user email in state');
            setHistoryEntries([]);
            return;
        }

        console.log('Fetching history for email:', userEmail);

        try {
            setHistoryTabLoading(true);
            const response = await axios.post(`${URL}/api/history/get`, { email: userEmail });
            console.log('Fetch history response:', response.data);
            setHistoryEntries(response.data.history || []);
        } catch (err) {
            console.error('Fetch history error:', err);
            setHistoryEntries([]);
            toast.error('Failed to load history entries', { position: 'top-center' });
        } finally {
            setHistoryTabLoading(false);
        }
    };

// Delete a specific history record
    const handleDeleteHistory = async (historyId) => {
        try {
            await axios.delete(`${URL}/api/history/delete/${userEmail}/${historyId}`);
            setHistoryEntries(prev => prev.filter(h => h.id !== historyId));
        } catch (err) {
            console.error('Delete history error:', err);
        }
    };



    return (
        <div>
            <Navbar />
            <ToastContainer />
            <div className="container mt-5" style={{ paddingTop: '20px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                <ul className="nav nav-pills">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'photos' ? 'active' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'photos' ? '#40E0D0' : '#CD5700',
                                color: 'white',
                                borderRadius: '50px',
                                margin: '0 5px'
                            }}
                            onClick={() => setActiveTab('photos')}
                        >
                            Google Photos
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'history' ? '#40E0D0' : '#CD5700',
                                color: 'white',
                                borderRadius: '50px',
                                margin: '0 5px'
                            }}
                            onClick={() => { 
                                setActiveTab('history'); 
                                refreshUserEmail(); // Refresh email before fetching history
                                fetchHistoryEntries(); 
                            }}
                        >
                            Your History
                        </button>
                    </li>
                </ul>
            </div>

            <div style={{ padding: '20px' }}>
                {activeTab === 'photos' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                        {(photos || []).map(photo => (
                            <div
                                key={photo.id}
                                style={styles.photoWrapper}
                                onClick={() => handleAnalyzePhoto(photo.id, photo.baseUrl)}
                                className="photo-item"
                            >
                                <div style={styles.imageContainer} className="image-container">
                                    <img
                                        src={`${photo.baseUrl}=w400`}
                                        alt="Google Photo"
                                        style={{ width: '100%', borderRadius: '8px' }}
                                    />
                                    <div style={styles.hoverOverlay} className="hover-overlay">
                                        <span style={styles.analyzeText}>Platify!</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div>
                        <h5 className="text-center mb-3">Your Saved Searches</h5>
                        {historyTabLoading ? (
                            <p className="text-center">Loading your saved entries...</p>
                        ) : historyEntries.length === 0 ? (
                            <p className="text-center">No saved history yet!</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                                {historyEntries.map(entry => {
                                    const isExpanded = expandedCardId === entry.id;

                                    const toggleExpand = () => {
                                        if (isExpanded) {
                                            setExpandedCardId(null);
                                        } else {
                                            setExpandedCardId(entry.id);
                                        }
                                    };

                                    return (
                                        <motion.div
                                            key={entry.id}
                                            style={{
                                                border: '1px solid #ccc',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                                padding: '12px',
                                                width: '280px',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                background: isExpanded ? '#f9f9f9' : '#fff',
                                                transition: '0.3s'
                                            }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={toggleExpand}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <img
                                                    src={entry.photoUrl && entry.photoUrl.includes('storage.googleapis.com') 
                                                        ? entry.photoUrl 
                                                        : `${entry.photoUrl}=w400`}
                                                    alt="Saved"
                                                    style={{ width: '100%', borderRadius: '8px' }}
                                                />
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: '#555',
                                                    marginTop: '8px',
                                                    textAlign: 'center'
                                                }}>
                                                    {entry.timestamp ? new Date(entry.timestamp._seconds * 1000).toLocaleString() : 'No Date'}
                                                </div>

                                                {/* Small rotating arrow */}
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '10px',
                                                        right: '10px',
                                                        fontSize: '18px',
                                                        transition: '0.3s',
                                                        transformOrigin: 'center'
                                                    }}
                                                >
                                                    ➡️
                                                </motion.div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        style={{ overflow: 'hidden', marginTop: '10px', fontSize: '13px' }}
                                                    >
                                                        <strong>Recipe:</strong>
                                                        <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '8px' }}>
                                                            {entry.recipePrompt}
                                                        </div>

                                                        <strong>Restaurants:</strong>
                                                        <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                                            {entry.restaurantPrompt}
                                                        </div>

                                                        <button
                                                            className="btn btn-sm btn-danger mt-2"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteHistory(entry.id); }}
                                                            style={{ width: '100%', marginTop: '10px' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                contentLabel="Vision Analysis"
                style={{
                    overlay: {
                        paddingTop: '80px',
                        overflow: 'auto'
                    },
                    content: {
                        maxWidth: '900px',
                        maxHeight: '80vh',
                        margin: '80px auto auto',
                        padding: '30px',
                        overflow: 'auto'
                    }
                }}
            >
                {selectedPhoto && (
                    <>
                        <div style={{ display: 'flex', gap: '30px' }}>
                            <div>
                                {/* Display original image */}
                                <img
                                    src={`${selectedPhoto.url}=w400`}
                                    alt="Selected Photo"
                                    style={{ width: '300px', borderRadius: '8px' }}
                                />
                                {/* Keep canvas for censored image but hide it */}
                                <canvas
                                    ref={canvasRef}
                                    style={{ display: 'none' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <ul className="nav nav-pills mb-3">
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${modalActiveTab === 'analysis' ? 'active' : ''}`} 
                                            style={{
                                                backgroundColor: modalActiveTab === 'analysis' ? '#40E0D0' : '#CD5700',
                                                color: 'white',
                                                borderRadius: '50px',
                                                margin: '0 5px'
                                            }}
                                            onClick={() => setModalActiveTab('analysis')}
                                        >
                                            Analysis
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${modalActiveTab === 'recipes' ? 'active' : ''}`} 
                                            style={{
                                                backgroundColor: modalActiveTab === 'recipes' ? '#40E0D0' : '#CD5700',
                                                color: 'white',
                                                borderRadius: '50px',
                                                margin: '0 5px'
                                            }}
                                            onClick={() => { setModalActiveTab('recipes'); if (selectedData) handleGeminiRecipeRequest(); }}
                                        >
                                            Recipe
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${modalActiveTab === 'restaurants' ? 'active' : ''}`}
                                            style={{
                                                backgroundColor: modalActiveTab === 'restaurants' ? '#40E0D0' : '#CD5700',
                                                color: 'white',
                                                borderRadius: '50px',
                                                margin: '0 5px'
                                            }}
                                            onClick={() => {
                                                setModalActiveTab('restaurants');
                                                if (geminiOutput && userLocation && /^\d{5}$/.test(userLocation)) {
                                                    handleGeminiRestaurantRequest();
                                                }
                                            }}
                                        >
                                            Restaurants
                                        </button>
                                    </li>
                                    <li className="nav-item ml-auto" style={{ marginLeft: 'auto' }}>
                                        <button
                                            className="nav-link"
                                            style={{
                                                backgroundColor: '#008080',
                                                color: 'white',
                                                borderRadius: '50px',
                                                margin: '0 5px',
                                                fontWeight: 'bold',
                                                fontSize: '18px',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                padding: '0'
                                            }}
                                            onClick={() => {
                                                setModalOpen(false);
                                                setTemperature(1.0); // Reset temperature when modal is closed
                                                setProcessedImage(null); // Reset processed image when modal is closed
                                                setUserLocation(''); // Clear zip code field when modal is closed
                                                setZipCodeError(''); // Clear any zip code errors
                                            }}
                                        >
                                            X
                                        </button>
                                    </li>
                                </ul>
                                {modalActiveTab === 'analysis' && selectedData && (
                                    <div>
                                        <div style={{ marginTop: '20px' }}>
                                            <strong>Labels:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                                {selectedData.labelDescriptions ? (
                                                    selectedData.labelDescriptions.map((label, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                if (selectedLabels.includes(label)) {
                                                                    setSelectedLabels(selectedLabels.filter(l => l !== label));
                                                                } else {
                                                                    setSelectedLabels([...selectedLabels, label]);
                                                                }
                                                            }}
                                                            style={{
                                                                backgroundColor: selectedLabels.includes(label) ? '#CD5700' : '#40E0D0',
                                                                color: 'white',
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                cursor: 'pointer',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {label}
                                                        </div>
                                                    ))
                                                ) : (
                                                    selectedData.labels.map((label, idx) => {
                                                        const labelText = typeof label === 'string' ? label : label.description;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => {
                                                                    if (selectedLabels.includes(labelText)) {
                                                                        setSelectedLabels(selectedLabels.filter(l => l !== labelText));
                                                                    } else {
                                                                        setSelectedLabels([...selectedLabels, labelText]);
                                                                    }
                                                                }}
                                                                style={{
                                                                    backgroundColor: selectedLabels.includes(labelText) ? '#CD5700' : '#40E0D0',
                                                                    color: 'white',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '20px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '14px'
                                                                }}
                                                            >
                                                                {labelText}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <strong style={{ marginTop: '20px', display: 'block' }}>Emotions:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                                {selectedData.emotions.length > 0 ? (
                                                    selectedData.emotions.map((emotion, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                if (selectedEmotions.includes(emotion)) {
                                                                    setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
                                                                } else {
                                                                    setSelectedEmotions([...selectedEmotions, emotion]);
                                                                }
                                                            }}
                                                            style={{
                                                                backgroundColor: selectedEmotions.includes(emotion) ? '#CD5700' : '#40E0D0',
                                                                color: 'white',
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                cursor: 'pointer',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {emotion}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div>No emotions detected.</div>
                                                )}
                                            </div>

                                            <strong style={{ marginTop: '20px', display: 'block' }}>Colors:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                                {selectedData.colors.map((color, idx) => {
                                                    const colorKey = `rgb(${color.red},${color.green},${color.blue})`;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                if (selectedColors.some(c => 
                                                                    c.red === color.red && 
                                                                    c.green === color.green && 
                                                                    c.blue === color.blue
                                                                )) {
                                                                    setSelectedColors(selectedColors.filter(c => 
                                                                        !(c.red === color.red && 
                                                                        c.green === color.green && 
                                                                        c.blue === color.blue)
                                                                    ));
                                                                } else {
                                                                    setSelectedColors([...selectedColors, color]);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: '30px',
                                                                    height: '30px',
                                                                    backgroundColor: colorKey,
                                                                    border: selectedColors.some(c => 
                                                                        c.red === color.red && 
                                                                        c.green === color.green && 
                                                                        c.blue === color.blue
                                                                    ) ? '3px solid #CD5700' : '3px solid #40E0D0',
                                                                    borderRadius: '4px'
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalActiveTab === 'restaurants' && (
                                    <div>
                                        <h5>Restaurant Suggestions</h5>
                                        <form onSubmit={handleGeminiRestaurantRequest}>
                                            <label htmlFor="locationInput">Enter Location (Zip code):</label>
                                            <input
                                                id="locationInput"
                                                type="text"
                                                value={userLocation}
                                                onChange={(e) => {
                                                    setUserLocation(e.target.value);
                                                    // Clear error when user types
                                                    if (zipCodeError) setZipCodeError('');
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleGeminiRestaurantRequest(e);
                                                    }
                                                }}
                                                pattern="\d{5}"
                                                maxLength="5"
                                                required
                                                placeholder="e.g., 94107"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    border: zipCodeError ? '1px solid #ff0000' : '1px solid #ccc',
                                                    marginTop: '8px',
                                                    marginBottom: zipCodeError ? '8px' : '16px'
                                                }}
                                            />
                                            {zipCodeError && (
                                                <div style={{ 
                                                    color: '#ff0000', 
                                                    fontSize: '14px', 
                                                    marginBottom: '16px',
                                                    marginTop: '-4px'
                                                }}>
                                                    {zipCodeError}
                                                </div>
                                            )}
                                        </form>
                                        {isLoadingRestaurants ? (
                                            <p>⏳ Fetching restaurant suggestions from Gemini...</p>
                                        ) : (
                                            <div
                                                className="markdown-content"
                                                dangerouslySetInnerHTML={{ __html: markdownToHtml(restaurantOutput) }}
                                            />
                                        )}
                                    </div>
                                )}



                                {modalActiveTab === 'recipes' && (
                                    <div style={{ textAlign: 'left', width: '100%' }}>
                                        {isLoadingRecipe ? (
                                            <p>🍳 Cooking up your recipe…</p>
                                        ) : (
                                            <>
                                                {/* Recipe Content */}
                                                <div style={{ width: '100%' }}>
                                                    {geminiImage && (
                                                        <img
                                                            src={geminiImage}
                                                            alt="Generated Dish"
                                                            style={{ maxWidth: '300px', borderRadius: '8px', marginBottom: '20px' }}
                                                        />
                                                    )}
                                                    <div
                                                        className="markdown-content"
                                                        style={{
                                                            maxHeight: '400px',
                                                            overflowY: 'auto',
                                                            paddingRight: '10px',
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: markdownToHtml(geminiOutput) }}
                                                    />

                                                    {/* Regenerate Button */}
                                                    <div style={{ marginTop: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="nav-link"
                                                            style={{
                                                                backgroundColor: '#40E0D0',
                                                                color: 'white',
                                                                borderRadius: '50px',
                                                                padding: '8px 20px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontWeight: 'bold'
                                                            }}
                                                            onClick={() => {
                                                                // Increase temperature by 0.2, max 2.0
                                                                const newTemp = Math.min(temperature + 0.2, 2.0);
                                                                setTemperature(newTemp);
                                                                // Call handleGeminiRecipeRequest with regenerate=true
                                                                handleGeminiRecipeRequest(true);
                                                            }}
                                                        >
                                                            Regenerate Recipe
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Image Generation Tile - Moved outside the recipe content div */}
                                                {geminiOutput && !isLoadingRecipe && (
                                                    <div 
                                                        style={{ 
                                                            marginTop: '20px',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '8px',
                                                            padding: '15px',
                                                            backgroundColor: '#f9f9f9',
                                                            width: '100%',
                                                            boxSizing: 'border-box',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        <h5>Generate Images for this Recipe</h5>

                                                        {generatedImages.length === 0 ? (
                                                            <button 
                                                                style={{
                                                                    backgroundColor: '#D35400', /* Burnt orange color */
                                                                    color: 'white',
                                                                    borderRadius: '50px', /* Pill shape */
                                                                    padding: '8px 20px',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 'bold'
                                                                }}
                                                                onClick={handleGenerateImages}
                                                                disabled={isGeneratingImages}
                                                            >
                                                                {isGeneratingImages ? 'Generating...' : 'Generate Images'}
                                                            </button>
                                                        ) : (
                                                            <div style={{ marginTop: '15px' }}>
                                                                {/* Image Slide Deck */}
                                                                <div style={{ 
                                                                    position: 'relative',
                                                                    width: '100%',
                                                                    margin: '0 auto',
                                                                    height: '300px',
                                                                    backgroundColor: '#eee',
                                                                    borderRadius: '8px',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    {/* Current Image */}
                                                                    <div style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        display: 'flex',
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        <img 
                                                                            src={`data:${generatedImages[currentImageIndex].mimeType};base64,${generatedImages[currentImageIndex].data}`}
                                                                            alt={`Generated dish ${currentImageIndex + 1}`}
                                                                            style={{
                                                                                maxWidth: '100%',
                                                                                maxHeight: '100%',
                                                                                objectFit: 'contain'
                                                                            }}
                                                                        />
                                                                    </div>

                                                                    {/* Navigation Arrows */}
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '0',
                                                                        left: '0',
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        padding: '0'
                                                                    }}>
                                                                        <button 
                                                                            onClick={() => setCurrentImageIndex(prev => (prev === 0 ? generatedImages.length - 1 : prev - 1))}
                                                                            style={{
                                                                                background: '#f8a26a', /* Burnt orange color */
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '4px', /* Bar style */
                                                                                width: '80px',
                                                                                height: '100%', /* Fill the entire height */
                                                                                fontSize: '20px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                justifyContent: 'center',
                                                                                alignItems: 'center'
                                                                            }}
                                                                        >
                                                                            &#9664; {/* Bar style arrow */}
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setCurrentImageIndex(prev => (prev === generatedImages.length - 1 ? 0 : prev + 1))}
                                                                            style={{
                                                                                background: '#f8a26a', /* Burnt orange color */
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '4px', /* Bar style */
                                                                                width: '80px',
                                                                                height: '100%', /* Fill the entire height */
                                                                                fontSize: '20px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                justifyContent: 'center',
                                                                                alignItems: 'center'
                                                                            }}
                                                                        >
                                                                            &#9654; {/* Bar style arrow */}
                                                                        </button>
                                                                    </div>

                                                                    {/* Image Counter Pips */}
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        bottom: '10px',
                                                                        left: '0',
                                                                        width: '100%',
                                                                        textAlign: 'center',
                                                                        display: 'flex',
                                                                        justifyContent: 'center',
                                                                        gap: '8px'
                                                                    }}>
                                                                        {generatedImages.map((_, index) => (
                                                                            <div
                                                                                key={index}
                                                                                onClick={() => setCurrentImageIndex(index)}
                                                                                style={{
                                                                                    width: '12px',
                                                                                    height: '12px',
                                                                                    borderRadius: '50%',
                                                                                    backgroundColor: index === currentImageIndex ? '#D35400' : '#40E0D0', /* Burnt orange for active, light turquoise for inactive */
                                                                                    cursor: 'pointer',
                                                                                    transition: 'background-color 0.3s'
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {geminiOutput &&
                                    geminiOutput.trim() !== '' &&
                                    geminiOutput !== 'No response from Gemini.' && (
                                        <div style={{ textAlign: 'left', marginTop: '20px', position: 'absolute', bottom: '20px', left: '30px' }}>
                                            <button
                                                style={{
                                                    backgroundColor: '#40E0D0',
                                                    color: 'white',
                                                    borderRadius: '50px',
                                                    padding: '8px 20px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                                onClick={handleSaveHistory}
                                                disabled={isLoadingRecipe}
                                                title="Save this recipe to your history"
                                            >
                                                {isLoadingRecipe ? 'Please wait...' : 'Save'}
                                            </button>
                                            {!userEmail && (
                                                <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                                                    Login required to save history
                                                </div>
                                            )}
                                        </div>
                                    )}


                            </div>
                        </div>

                    </>
                )}
            </Modal>
        </div>
    );
};

export default Profile;
