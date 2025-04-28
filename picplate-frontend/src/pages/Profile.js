/**
 * Profile Component
 * 
 * This is the main component of the PicPlate application that handles:
 * 1. Displaying and selecting images from Google Photos
 * 2. Analyzing images using Google Vision API
 * 3. Generating recipes from images using Google Gemini AI
 * 4. Generating restaurant recommendations based on recipes
 * 5. Generating images for recipes
 * 6. Saving and displaying user history
 * 
 * The component uses multiple APIs and maintains complex state to provide
 * a seamless user experience for food image analysis and recipe generation.
 */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import Navbar from '../components/navbar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import '../assets/styles/Profile.css';
import { markdownToHtml, extractDishName } from '../utils/markdownUtils';
import { resizeAndCompressImage, drawImageAndBoxes } from '../utils/imageUtils';
import { refreshUserEmail } from '../utils/userUtils';

// Set the app element for accessibility with react-modal
Modal.setAppElement('#root');

/**
 * Profile Component - Main functional component for the PicPlate application
 */
const Profile = () => {
    // ===== Photo and Analysis State =====
    const [photos, setPhotos] = useState([]);                   // List of user's Google Photos
    const [error, setError] = useState(null);                   // Error message if photo fetching fails
    const [analysisResults, setAnalysisResults] = useState({}); // Vision API results keyed by photo ID
    const [selectedPhoto, setSelectedPhoto] = useState(null);   // Currently selected photo object
    const [processedImage, setProcessedImage] = useState(null); // Image with faces censored

    // ===== UI State =====
    const [modalOpen, setModalOpen] = useState(false);          // Controls the main modal visibility
    const [activeTab, setActiveTab] = useState('photos');       // Main tab selection (photos/history)
    const [modalActiveTab, setModalActiveTab] = useState('analysis'); // Modal tab selection
    const [expandedCardId, setExpandedCardId] = useState(null); // ID of expanded history card

    // ===== Analysis Selection State =====
    const [selectedLabels, setSelectedLabels] = useState([]);   // User-selected image labels
    const [selectedEmotions, setSelectedEmotions] = useState([]);// User-selected emotions
    const [selectedColors, setSelectedColors] = useState([]);   // User-selected colors

    // ===== Recipe Generation State =====
    const [geminiOutput, setGeminiOutput] = useState('');       // Generated recipe text
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false); // Loading state for recipe
    const [hasGeneratedRecipe, setHasGeneratedRecipe] = useState(false); // Tracks if recipe was generated
    const [geminiImage, setGeminiImage] = useState('');         // Image returned with recipe
    const [temperature, setTemperature] = useState(1.0);        // Creativity parameter for Gemini

    // ===== Restaurant Recommendation State =====
    const [userLocation, setUserLocation] = useState('');       // User's zip code for restaurants
    const [zipCodeError, setZipCodeError] = useState('');       // Validation error for zip code
    const [restaurantOutput, setRestaurantOutput] = useState(''); // Generated restaurant recommendations
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false); // Loading state
    const [hasGeneratedRestaurants, setHasGeneratedRestaurants] = useState(false); // Tracks generation

    // ===== User and History State =====
    const [userEmail, setUserEmail] = useState('');             // User's email for authentication
    const [historyEntries, setHistoryEntries] = useState([]);   // User's saved history items
    const [historyTabLoading, setHistoryTabLoading] = useState(false); // Loading state for history

    // ===== Image Generation State =====
    const [generatedImages, setGeneratedImages] = useState([]); // AI-generated images for recipe
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // Index of displayed image
    const [isGeneratingImages, setIsGeneratingImages] = useState(false); // Loading state

    /**
     * Updates the userEmail state from localStorage
     * 
     * This function uses the imported refreshUserEmail utility to get the
     * user's email from localStorage, then updates the component state.
     * 
     * @returns {string|null} The user's email or null if not found
     */
    const refreshUserEmailState = () => {
        const email = refreshUserEmail();
        if (email) {
            setUserEmail(email);
        }
        return email;
    };

    // Reference to the canvas element for drawing images with bounding boxes
    const canvasRef = useRef(null);

    // API base URL from environment variables or default to localhost
    const URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    /**
     * Initial data loading effect
     * 
     * This effect runs once when the component mounts and:
     * 1. Refreshes the user email from localStorage
     * 2. Fetches the user's Google Photos
     * 3. Handles authentication errors
     */
    useEffect(() => {
        // Get user email from localStorage
        refreshUserEmailState();

        // Get Google authentication data from localStorage
        const googleUserItem = localStorage.getItem('google_user');
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
        const token = googleUser?.access_token || localStorage.getItem('google_access_token');

        /**
         * Fetches photos from Google Photos API via our backend
         */
        const fetchPhotos = async () => {
            try {
                const response = await axios.post(`${URL}/api/photos`, { accessToken: token });
                setPhotos(response.data.photos || []);
            } catch (err) {
                console.error('Failed to fetch photos:', err);
                // Handle authentication errors (expired token)
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    toast.error('Session expired. Please login again.', { position: 'top-center' });
                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }, 1500);
                } else {
                    // Handle other errors
                    setError('Failed to load Google Photos.');
                }
            }
        };

        // Execute the photo fetching function
        fetchPhotos();
    }, []);


    /**
     * Analyzes a photo using Google Vision API
     * 
     * This function is called when a user clicks on a photo in the grid.
     * It sends the photo to the Vision API for analysis, resets the UI state,
     * and opens the modal to display the results.
     * 
     * @param {string} photoId - The ID of the selected photo
     * @param {string} photoUrl - The URL of the selected photo
     */
    const handleAnalyzePhoto = async (photoId, photoUrl) => {
        // Get authentication token from localStorage
        const googleUserItem = localStorage.getItem('google_user');
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
        const accessToken = googleUser?.access_token || localStorage.getItem('google_access_token');

        // Reset canvas if it exists to clear any previous drawings
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        // Refresh user email to ensure we have the latest value
        refreshUserEmailState();

        // Update selected photo and open modal
        setSelectedPhoto({ id: photoId, url: photoUrl });
        setModalOpen(true);

        // Reset all state variables related to the modal
        setModalActiveTab('analysis');  // Start with analysis tab
        setGeminiOutput('');            // Clear any previous recipe
        setGeminiImage('');             // Clear any previous recipe image
        setHasGeneratedRecipe(false);   // Reset recipe generation flag
        setHasGeneratedRestaurants(false); // Reset restaurant generation flag
        setRestaurantOutput('');        // Clear any previous restaurant recommendations
        setTemperature(1.0);            // Reset Gemini creativity parameter
        setProcessedImage(null);        // Clear any previous processed image

        // Reset user selections
        setSelectedLabels([]);          // Clear selected labels
        setSelectedEmotions([]);        // Clear selected emotions
        setSelectedColors([]);          // Clear selected colors

        try {
            // Call Vision API to analyze the image
            const response = await axios.post(`${URL}/api/vision`, {
                imageUrl: photoUrl,
                accessToken
            });

            // Store the processed image (with faces censored) if available
            if (response.data.processedImage) {
                setProcessedImage(response.data.processedImage);
            } else {
                setProcessedImage(null);
            }

            // Store analysis results in state, keyed by photo ID
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

    // Function to draw image and bounding boxes on canvas (now using imported function)
    const handleDrawImageAndBoxes = () => {
        drawImageAndBoxes(selectedPhoto, selectedData, canvasRef);
    };

    // Effect to draw boxes when analysis results change
    useEffect(() => {
        handleDrawImageAndBoxes();
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

    /**
     * Generates a recipe using Google's Gemini AI based on image analysis
     * 
     * This function sends the image analysis data (labels, emotions, colors) to the
     * Gemini API to generate a recipe. It can also regenerate a recipe with a different
     * temperature (creativity) setting.
     * 
     * @param {boolean} regenerate - Whether to force regeneration of an existing recipe
     */
    const handleGeminiRecipeRequest = async (regenerate = false) => {
        // Only proceed if we have analysis data
        if (!selectedData) return;

        // Skip generation if we already have a recipe and aren't explicitly regenerating
        if (!regenerate && hasGeneratedRecipe) return;

        // Set loading state to show user that generation is in progress
        setIsLoadingRecipe(true);

        // Ensure we have the latest user email
        refreshUserEmailState();

        try {
            // Update the canvas with the censored image for display
            // This ensures privacy protection for any faces in the image
            handleDrawImageAndBoxes();

            // Call the Gemini API to generate a recipe
            const response = await axios.post(`${URL}/api/gemini/generate-recipe`, {
                // Use user-selected labels if available, otherwise use all detected labels
                labels: selectedLabels.length > 0 ? selectedLabels : selectedData.labels,

                // Use user-selected emotions if available, otherwise use empty array
                emotions: selectedEmotions.length > 0 ? selectedEmotions : [],

                // Use user-selected colors if available, otherwise use empty array
                colors: selectedColors.length > 0 ? selectedColors : [],

                // Original image URL for reference
                imageUrl: selectedPhoto.url,

                // Temperature controls AI creativity (higher = more creative but less predictable)
                temperature: temperature,

                // Send the processed image with faces censored for privacy
                processedImage: processedImage
            });

            // Log response for debugging
            console.log('Received response from Gemini API:', response.data);

            // Update state with the generated recipe and image
            setGeminiOutput(response.data.recipe || 'No response from Gemini.');
            setGeminiImage(response.data.image || '');
            setHasGeneratedRecipe(true);

            // Reset any previously generated images when a new recipe is generated
            setGeneratedImages([]);
            setCurrentImageIndex(0);
        } catch (err) {
            // Detailed error logging for debugging
            console.error('Gemini API error:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response ? {
                    status: err.response.status,
                    data: err.response.data
                } : 'No response data'
            });

            // Create a user-friendly error message with details when available
            let errorMessage = 'Failed to get recipe from Gemini.';
            if (err.response && err.response.data && err.response.data.error) {
                errorMessage += ` Error: ${err.response.data.error}`;
            } else if (err.message) {
                errorMessage += ` Error: ${err.message}`;
            }

            // Display error message in the recipe area
            setGeminiOutput(errorMessage);
        } finally {
            // Always reset loading state when done, whether successful or not
            setIsLoadingRecipe(false);
        }
    };

    /**
     * Generates images for a recipe using AI
     * 
     * This function sends the recipe text to the Gemini API to generate
     * visual representations of the dish. It displays the generated images
     * in a carousel below the recipe.
     */
    const handleGenerateImages = async () => {
        // Verify we have a recipe to generate images for
        if (!geminiOutput) {
            toast.info('Please generate a recipe first', { position: 'top-center' });
            return;
        }

        // Set loading state and clear any previous images
        setIsGeneratingImages(true);
        setGeneratedImages([]);

        try {
            // Call the API to generate images based on the recipe text
            const response = await axios.post(`${URL}/api/gemini/generate-images`, {
                recipeText: geminiOutput
            });

            // Log response for debugging
            console.log('Received image generation response:', response.data);

            // Process the response
            if (response.data.images && response.data.images.length > 0) {
                // Store the generated images and set the first one as active
                setGeneratedImages(response.data.images);
                setCurrentImageIndex(0);
            } else {
                // Handle case where no images were generated
                toast.warning('No images were generated', { position: 'top-center' });
            }
        } catch (err) {
            // Handle errors
            console.error('Image generation error:', err);
            toast.error('Failed to generate images', { position: 'top-center' });
        } finally {
            // Always reset loading state when done
            setIsGeneratingImages(false);
        }
    };


    /**
     * Generates restaurant recommendations based on the recipe
     * 
     * This function extracts the dish name from the generated recipe and
     * uses it along with the user's location (zip code) to find restaurants
     * that serve similar dishes in the user's area.
     * 
     * @param {Event} e - Optional event object if called from a form submission
     */
    const handleGeminiRestaurantRequest = async (e) => {
        // Prevent form submission default behavior if called from a form
        if (e) {
            e.preventDefault();
        }

        // Verify we have a recipe to base recommendations on
        if (!geminiOutput) {
            console.error('Cannot generate restaurants: recipe missing.');
            return;
        }

        // Extract the dish name from the recipe text using utility function
        const dishName = extractDishName(geminiOutput);

        // Validate zip code format (must be exactly 5 digits)
        const zipCodeRegex = /^\d{5}$/;
        if (!zipCodeRegex.test(userLocation)) {
            console.warn('Invalid zip code format.');
            setZipCodeError('Invalid zip code. Please enter a 5-digit zip code.');
            return;
        }

        // Clear any previous validation error
        setZipCodeError('');

        // Set loading state to show user that generation is in progress
        setIsLoadingRestaurants(true);

        try {
            // Call the API to generate restaurant recommendations
            const response = await axios.post(`${URL}/api/gemini/generate-restaurants`, {
                dishName,                // The extracted dish name from the recipe
                userLocation,            // User's zip code
                processedImage: processedImage // Privacy-protected image (faces censored)
            });

            // Update state with the generated restaurant recommendations
            setRestaurantOutput(response.data.restaurants || 'No restaurant suggestions received.');
            setHasGeneratedRestaurants(true);
        } catch (err) {
            // Handle errors
            console.error('Gemini restaurant generation error:', err);
            setRestaurantOutput('Failed to get restaurant suggestions.');
        } finally {
            // Always reset loading state when done
            setIsLoadingRestaurants(false);
        }
    };


    /**
     * Saves the current recipe and restaurant recommendations to user history
     * 
     * This function saves the generated recipe, restaurant recommendations,
     * and associated image to the user's history in the database. It handles
     * authentication verification, image processing, and error handling.
     */
    const handleSaveHistory = async () => {
        // Trim whitespace from recipe and restaurant text
        const trimmedRecipe = (geminiOutput || '').trim();
        const trimmedRestaurants = (restaurantOutput || '').trim();

        // Get fresh user email directly from localStorage for authentication
        // This is a backup approach in case the state value is stale
        const googleUserItem = localStorage.getItem('google_user');
        const userItem = localStorage.getItem('user');
        let freshEmail = '';

        try {
            // First try to get email from Google user object
            const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
            if (googleUser?.email) {
                freshEmail = googleUser.email;
            } else {
                // If not found, try the regular user object
                const user = userItem && userItem !== 'undefined' ? JSON.parse(userItem) : null;
                if (user?.email) {
                    freshEmail = user.email;
                }
            }
        } catch (err) {
            console.error('Error parsing localStorage for email:', err);
        }

        // Verify we have a valid user email
        if (!freshEmail) {
            console.error('No user email found in localStorage.');
            toast.error('Login expired. Please login again.', { position: 'top-center' });
            // Redirect to login page after a short delay
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/';
            }, 1500);
            return;
        }

        console.log('Attempting to save with email:', freshEmail);

        // Verify we have a recipe to save
        if (!trimmedRecipe || trimmedRecipe === 'No response from Gemini.') {
            toast.info('Please generate a recipe before saving.', { position: 'top-center' });
            return;
        }

        try {
            // Prepare image data for saving
            let imageData = null;
            let photoUrl = selectedPhoto?.url || '';

            // If AI-generated images exist, use the currently displayed one
            if (generatedImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < generatedImages.length) {
                console.log('Using generated image for upload');

                // Optimize the image before sending to server
                try {
                    // Resize and compress to reduce file size
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

            // Save to backend API
            const response = await axios.post(`${URL}/api/history/save`, {
                email: freshEmail,                // User identifier
                recipePrompt: trimmedRecipe,      // Generated recipe
                restaurantPrompt: trimmedRestaurants || 'No restaurant suggestions available.',
                photoUrl: photoUrl,               // Original photo URL (if no generated image)
                imageData: imageData              // Generated image data (if available)
            });

            // Handle successful save
            console.log('Save history response:', response.data);
            toast.success('Saved successfully!', { position: 'top-center' });

            // Reset UI state
            setModalOpen(false);
            setTemperature(1.0);          // Reset temperature for next generation
            setProcessedImage(null);      // Clear processed image
            setUserLocation('');          // Clear zip code
            setZipCodeError('');          // Clear any validation errors
            setActiveTab('photos');       // Switch back to photos tab

            // Refresh history entries to show the newly saved item
            fetchHistoryEntries();
        } catch (err) {
            // Handle save errors
            console.error('Save history error:', err);
            let errorMessage = 'Failed to save history.';
            if (err.response?.data?.error) {
                errorMessage += ` Error: ${err.response.data.error}`;
            }
            toast.error(errorMessage, { position: 'top-center' });
            // Note: We don't force logout on save failure as that would be disruptive
        }
    };


    /**
     * Fetches the user's saved history entries from the server
     * 
     * This function retrieves all saved recipes and restaurant recommendations
     * for the current user. It's called when the history tab is selected and
     * after a new entry is saved.
     */
    const fetchHistoryEntries = async () => {
        // Verify we have a user email to fetch history for
        if (!userEmail) {
            console.warn('Cannot fetch history: No user email in state');
            setHistoryEntries([]);  // Clear any existing entries
            return;
        }

        console.log('Fetching history for email:', userEmail);

        try {
            // Set loading state to show user that data is being fetched
            setHistoryTabLoading(true);

            // Call API to get user's history
            const response = await axios.post(`${URL}/api/history/get`, { email: userEmail });

            // Log response for debugging
            console.log('Fetch history response:', response.data);

            // Update state with fetched history entries
            // If no history is found, default to empty array
            setHistoryEntries(response.data.history || []);
        } catch (err) {
            // Handle errors
            console.error('Fetch history error:', err);
            setHistoryEntries([]);  // Clear entries on error
            toast.error('Failed to load history entries', { position: 'top-center' });
        } finally {
            // Always reset loading state when done
            setHistoryTabLoading(false);
        }
    };

    /**
     * Deletes a specific history entry from the user's saved history
     * 
     * This function removes a saved recipe/restaurant entry from the database
     * and updates the UI to reflect the deletion without requiring a full refresh.
     * 
     * @param {string} historyId - The unique ID of the history entry to delete
     */
    const handleDeleteHistory = async (historyId) => {
        try {
            // Call API to delete the specified history entry
            await axios.delete(`${URL}/api/history/delete/${userEmail}/${historyId}`);

            // Update local state by filtering out the deleted entry
            // This provides immediate UI feedback without needing to refetch
            setHistoryEntries(prev => prev.filter(h => h.id !== historyId));
        } catch (err) {
            // Handle errors
            console.error('Delete history error:', err);
            toast.error('Failed to delete history entry', { position: 'top-center' });
        }
    };



    return (
        <div>
            <Navbar />
            <ToastContainer />
            <div className="container mt-5 main-container">
                <ul className="nav nav-pills">
                    <li className="nav-item">
                        <button
                            className={`nav-link tab-button ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            Google Photos
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link tab-button ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => { 
                                setActiveTab('history'); 
                                refreshUserEmailState(); // Refresh email before fetching history
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
                    <div className="photo-grid">
                        {(photos || []).map(photo => (
                            <div
                                key={photo.id}
                                className="photo-wrapper photo-item"
                                onClick={() => handleAnalyzePhoto(photo.id, photo.baseUrl)}
                            >
                                <div className="image-container">
                                    <img
                                        src={`${photo.baseUrl}=w400`}
                                        alt="Google Photo"
                                        className="photo-image"
                                    />
                                    <div className="hover-overlay">
                                        <span className="analyze-text">Platify!</span>
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
                                            className={`history-card ${isExpanded ? 'expanded' : ''}`}
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
                                                    className="history-card-image"
                                                />
                                                <div className="history-card-date">
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
                                                        className="history-card-content"
                                                    >
                                                        <strong>Recipe:</strong>
                                                        <div 
                                                            className="history-card-section"
                                                            dangerouslySetInnerHTML={{ __html: markdownToHtml(entry.recipePrompt) }}
                                                        />

                                                        <strong>Restaurants:</strong>
                                                        <div 
                                                            className="history-card-section"
                                                            dangerouslySetInnerHTML={{ __html: markdownToHtml(entry.restaurantPrompt) }}
                                                        />

                                                        <button
                                                            className="btn btn-sm btn-danger mt-2 delete-button"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteHistory(entry.id); }}
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
                                            className={`nav-link tab-button ${modalActiveTab === 'analysis' ? 'active' : ''}`} 
                                            onClick={() => setModalActiveTab('analysis')}
                                        >
                                            Analysis
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link tab-button ${modalActiveTab === 'recipes' ? 'active' : ''}`} 
                                            onClick={() => { setModalActiveTab('recipes'); if (selectedData) handleGeminiRecipeRequest(); }}
                                        >
                                            Recipe
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link tab-button ${modalActiveTab === 'restaurants' ? 'active' : ''}`}
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
                                            className="nav-link modal-close-button"
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
                                        <div className="analysis-section">
                                            <div className="section-header">
                                                <strong>Labels:</strong>
                                                <div 
                                                    className="info-icon"
                                                    title="Click on labels to emphasize them during recipe generation"
                                                >
                                                    <i>i</i>
                                                </div>
                                            </div>
                                            <div className="section-content">
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
                                                            className={`chip ${selectedLabels.includes(label) ? 'selected' : ''}`}
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
                                                                className={`chip ${selectedLabels.includes(labelText) ? 'selected' : ''}`}
                                                            >
                                                                {labelText}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <div className="section-header">
                                                <strong>Emotions:</strong>
                                                <div 
                                                    className="info-icon"
                                                    title="Click on emotions to emphasize them during recipe generation"
                                                >
                                                    <i>i</i>
                                                </div>
                                            </div>
                                            <div className="section-content">
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
                                                            className={`chip ${selectedEmotions.includes(emotion) ? 'selected' : ''}`}
                                                        >
                                                            {emotion}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div>No emotions detected.</div>
                                                )}
                                            </div>

                                            <div className="section-header">
                                                <strong>Colors:</strong>
                                                <div 
                                                    className="info-icon"
                                                    title="Click on colors to emphasize them during recipe generation"
                                                >
                                                    <i>i</i>
                                                </div>
                                            </div>
                                            <div className="section-content">
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
                                                            className="color-chip"
                                                        >
                                                            <div
                                                                className={`color-swatch ${selectedColors.some(c => 
                                                                    c.red === color.red && 
                                                                    c.green === color.green && 
                                                                    c.blue === color.blue
                                                                ) ? 'selected' : ''}`}
                                                                style={{
                                                                    backgroundColor: colorKey
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
                                                className={`location-input ${zipCodeError ? 'error' : ''}`}
                                            />
                                            {zipCodeError && (
                                                <div className="error-message">
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
                                                        dangerouslySetInnerHTML={{ __html: markdownToHtml(geminiOutput) }}
                                                    />

                                                    {/* Regenerate Button */}
                                                    <div style={{ marginTop: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="action-button"
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
                                                    <div className="image-generation-tile">
                                                        <h5>Generate Images for this Recipe</h5>

                                                        {generatedImages.length === 0 ? (
                                                            <button 
                                                                className="generate-button"
                                                                onClick={handleGenerateImages}
                                                                disabled={isGeneratingImages}
                                                            >
                                                                {isGeneratingImages ? 'Generating...' : 'Generate Images'}
                                                            </button>
                                                        ) : (
                                                            <div style={{ marginTop: '15px' }}>
                                                                {/* Image Slide Deck */}
                                                                <div className="image-carousel">
                                                                    {/* Current Image */}
                                                                    <div className="carousel-image-container">
                                                                        <img 
                                                                            src={`data:${generatedImages[currentImageIndex].mimeType};base64,${generatedImages[currentImageIndex].data}`}
                                                                            alt={`Generated dish ${currentImageIndex + 1}`}
                                                                            className="carousel-image"
                                                                        />
                                                                    </div>

                                                                    {/* Navigation Arrows */}
                                                                    <div className="carousel-navigation">
                                                                        <button 
                                                                            className="carousel-arrow"
                                                                            onClick={() => setCurrentImageIndex(prev => (prev === 0 ? generatedImages.length - 1 : prev - 1))}
                                                                        >
                                                                            &#9664; {/* Bar style arrow */}
                                                                        </button>
                                                                        <button 
                                                                            className="carousel-arrow"
                                                                            onClick={() => setCurrentImageIndex(prev => (prev === generatedImages.length - 1 ? 0 : prev + 1))}
                                                                        >
                                                                            &#9654; {/* Bar style arrow */}
                                                                        </button>
                                                                    </div>

                                                                    {/* Image Counter Pips */}
                                                                    <div className="carousel-indicators">
                                                                        {generatedImages.map((_, index) => (
                                                                            <div
                                                                                key={index}
                                                                                onClick={() => setCurrentImageIndex(index)}
                                                                                className={`carousel-indicator ${index === currentImageIndex ? 'active' : ''}`}
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
                                        <div className="save-button-container">
                                            <button
                                                className="action-button"
                                                onClick={handleSaveHistory}
                                                disabled={isLoadingRecipe}
                                                title="Save this recipe to your history"
                                            >
                                                {isLoadingRecipe ? 'Please wait...' : 'Save'}
                                            </button>
                                            {!userEmail && (
                                                <div className="login-required-message">
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
