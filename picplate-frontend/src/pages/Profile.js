// frontend/src/pages/Profile.js
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import Navbar from '../components/navbar';
import showdown from 'showdown';

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
    const [activeTab, setActiveTab] = useState('analysis');
    const [useEmotions, setUseEmotions] = useState(false);
    const [useColors, setUseColors] = useState(false);
    const [userLocation, setUserLocation] = useState('');
    const [showBoundingBoxes] = useState(true); // Always true, user can't change it
    const [geminiOutput, setGeminiOutput] = useState('');
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
    const [restaurantOutput, setRestaurantOutput] = useState('');
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
    const [hasGeneratedRecipe, setHasGeneratedRecipe] = useState(false);
    const [hasGeneratedRestaurants, setHasGeneratedRestaurants] = useState(false);
    const [geminiImage, setGeminiImage] = useState('');

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
        const googleUserItem = localStorage.getItem('google_user');
        const googleUser = googleUserItem && googleUserItem !== 'undefined' ? JSON.parse(googleUserItem) : null;
        const token = googleUser?.access_token || localStorage.getItem('google_access_token');

        if (!token) {
            setError('User not authenticated. Please login again.');
            return;
        }

        const fetchPhotos = async () => {
            try {
                const response = await axios.post(`${URL}/api/photos`, {
                    accessToken: token

                });
                setPhotos(response.data.photos || []);
            } catch (err) {
                console.error('Failed to fetch photos:', err);
                setError('Failed to load Google Photos.');
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

        try {

            // Make sure the canvas has the censored image for display purposes
            // but we'll use the original image URL for the API call to avoid SecurityError
            drawImageAndBoxes();

            console.log('Sending request to Gemini API with data:', {
                labels: selectedData.labels,
                emotions: selectedData.emotions,
                colors: selectedData.colors,
                useEmotions: useEmotions,
                useColors: useColors
            });

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
        if (!geminiOutput || !userLocation || hasGeneratedRestaurants) return;

        setIsLoadingRestaurants(true);

        try {
            setIsLoadingRestaurants(true);
            setRestaurantOutput(''); // Clear previous output

            const response = await axios.post(`${URL}/api/gemini/generate-restaurants`, {
                dishName: extractDishName(geminiOutput),
                userLocation: userLocation
            });

            setRestaurantOutput(response.data.restaurants || 'No restaurant suggestions received.');
            setHasGeneratedRestaurants(true);
        } catch (err) {
            let errorMessage = 'Failed to get restaurant suggestions.';
            if (err.response?.data?.error) {
                errorMessage += ` Error: ${err.response.data.error}`;
            } else {
                errorMessage += ` Error: ${err.message}`;
            }
            setRestaurantOutput(errorMessage);
        } finally {
            setIsLoadingRestaurants(false);
        }
    };



    return (
        <div>
            <Navbar />
            <h2 className="text-center mt-3">Your Google Photos</h2>
            {error && <p className="text-danger text-center">{error}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', padding: '20px' }}>
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
                                        <button
                                            className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('analysis')}
                                        >
                                            Analysis
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'recipes' ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveTab('recipes');
                                                if (selectedData) {
                                                    handleGeminiRecipeRequest();
                                                }
                                            }}
                                        >
                                            Recipe
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'restaurants' ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveTab('restaurants');
                                                if (!hasGeneratedRestaurants) {
                                                    handleGeminiRestaurantRequest();
                                                }
                                            }}
                                        >
                                            Restaurants
                                        </button>
                                    </li>
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
                                        <label htmlFor="locationInput">Enter Location (Zip code):</label>
                                        <input
                                            id="locationInput"
                                            type="text"
                                            value={userLocation}
                                            onChange={(e) => setUserLocation(e.target.value)}
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
