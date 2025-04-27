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
    const [useEmotions, setUseEmotions] = useState(false);
    const [useColors, setUseColors] = useState(false);
    const [userLocation, setUserLocation] = useState('');
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
        return match ? match[1].split('\n')[0] : '';
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
        setGeminiOutput('');
        setGeminiImage('');
        setHasGeneratedRecipe(false);
        setHasGeneratedRestaurants(false);
        setRestaurantOutput('');
        setActiveTab('analysis');

        try {
            const response = await axios.post(`${URL}/api/vision`, {
                imageUrl: photoUrl,
                accessToken
            });

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
            handleGeminiRestaurantRequest();
        }
    }, [userLocation]);

    const handleGeminiRecipeRequest = async () => { // ✅ NEW FUNCTION
        if (!selectedData || hasGeneratedRecipe) return;

        setIsLoadingRecipe(true);

        // Refresh user email when generating a recipe
        refreshUserEmail();

        try {
            // Make sure the canvas has the censored image for display purposes
            // but we'll use the original image URL for the API call to avoid SecurityError
            drawImageAndBoxes();

            const response = await axios.post(`${URL}/api/gemini/generate-recipe`, {
                labels: selectedData.labels,
                emotions: selectedData.emotions,
                colors: selectedData.colors,
                useEmotions: useEmotions,
                useColors: useColors,
                imageUrl: selectedPhoto.url
            });

            console.log('Received response from Gemini API:', response.data);
            setGeminiOutput(response.data.recipe || 'No response from Gemini.');
            setGeminiImage(response.data.image || '');
            setHasGeneratedRecipe(true);
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


    const handleGeminiRestaurantRequest = async () => {
        if (!geminiOutput) {
            console.error('Cannot generate restaurants: recipe missing.');
            return;
        }

        const dishName = extractDishName(geminiOutput);

        // Validate zip code (5 digits)
        const zipCodeRegex = /^\d{5}$/;
        if (!zipCodeRegex.test(userLocation)) {
            console.warn('Invalid zip code format.');
            return;
        }

        setIsLoadingRestaurants(true);

        try {
            const response = await axios.post(`${URL}/api/gemini/generate-restaurants`, {
                dishName,
                userLocation
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
            const response = await axios.post(`${URL}/api/history/save`, {
                email: freshEmail,
                recipePrompt: trimmedRecipe,
                restaurantPrompt: trimmedRestaurants || 'No restaurant suggestions available.',
                photoUrl: selectedPhoto?.url || ''
            });

            console.log('Save history response:', response.data);
            toast.success('Saved successfully!', { position: 'top-center' });
            setModalOpen(false);
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
            <div className="container mt-4">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            Google Photos
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
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
                                        <span style={styles.analyzeText}>Analyze</span>
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
                                                    src={`${entry.photoUrl}=w400`}
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
                onRequestClose={() => setModalOpen(false)}
                contentLabel="Vision Analysis"
                style={{
                    content: {
                        maxWidth: '900px',
                        margin: 'auto',
                        padding: '30px'
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
                                <ul className="nav nav-tabs mb-3">
                                    <li className="nav-item">
                                        <button className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>Analysis</button>
                                    </li>
                                    <li className="nav-item">
                                        <button className={`nav-link ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => { setActiveTab('recipes'); if (selectedData) handleGeminiRecipeRequest(); }}>Recipe</button>
                                    </li>
                                    <button
                                        className={`nav-link ${activeTab === 'restaurants' ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveTab('restaurants');
                                            if (geminiOutput && userLocation && /^\d{5}$/.test(userLocation)) {
                                                handleGeminiRestaurantRequest();
                                            }
                                        }}
                                    >
                                        Restaurants
                                    </button>
                                </ul>
                                {activeTab === 'analysis' && selectedData && (
                                    <div>
                                        <h5>Checkbox Filters</h5>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={useEmotions}
                                                onChange={() => setUseEmotions(!useEmotions)}
                                            />{' '}
                                            Emotions
                                        </label>
                                        <label className="ml-3">
                                            <input
                                                type="checkbox"
                                                checked={useColors}
                                                onChange={() => setUseColors(!useColors)}
                                            />{' '}
                                            Colors
                                        </label>

                                        <div style={{ marginTop: '20px' }}>
                                            <strong>Labels:</strong>
                                            <ul>
                                                {selectedData.labelDescriptions ? (
                                                    selectedData.labelDescriptions.map((label, idx) => (
                                                        <li key={idx}>{label}</li>
                                                    ))
                                                ) : (
                                                    selectedData.labels.map((label, idx) => (
                                                        <li key={idx}>{typeof label === 'string' ? label : label.description}</li>
                                                    ))
                                                )}
                                            </ul>

                                            <strong>Emotions:</strong>
                                            <ul>
                                                {selectedData.emotions.length > 0 ? (
                                                    selectedData.emotions.map((e, i) => <li key={i}>{e}</li>)
                                                ) : (
                                                    <li>No emotions detected.</li>
                                                )}
                                            </ul>

                                            <strong>Colors:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {selectedData.colors.map((color, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            width: '25px',
                                                            height: '25px',
                                                            backgroundColor: `rgb(${color.red},${color.green},${color.blue})`,
                                                            border: '1px solid #999'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'restaurants' && (
                                    <div>
                                        <h5>Restaurant Suggestions</h5>
                                        <form onSubmit={handleGeminiRestaurantRequest}>
                                            <label htmlFor="locationInput">Enter Location (Zip code):</label>
                                            <input
                                                id="locationInput"
                                                type="text"
                                                value={userLocation}
                                                onChange={(e) => setUserLocation(e.target.value)}
                                                pattern="\d{5}"
                                                maxLength="5"
                                                required
                                                placeholder="e.g., 94107"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #ccc',
                                                    marginTop: '8px',
                                                    marginBottom: '16px'
                                                }}
                                            />
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



                                {activeTab === 'recipes' && (
                                    <div style={{ textAlign: 'center' }}>
                                        {isLoadingRecipe ? (
                                            <p>🍳 Cooking up your recipe…</p>
                                        ) : (
                                            <>
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
                                                        paddingRight: '10px'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(geminiOutput) }}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}

                                {geminiOutput &&
                                    geminiOutput.trim() !== '' &&
                                    geminiOutput !== 'No response from Gemini.' && (
                                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSaveHistory}
                                                disabled={isLoadingRecipe}
                                                title="Save this recipe to your history"
                                            >
                                                {isLoadingRecipe ? 'Please wait...' : 'Save to History'}
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

                        <button className="btn btn-secondary mt-4" onClick={() => setModalOpen(false)}>Close</button>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Profile;
