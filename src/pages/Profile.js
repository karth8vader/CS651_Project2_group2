// frontend/src/pages/Profile.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import Navbar from '../components/navbar';

Modal.setAppElement('#root');

const Profile = () => {
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState(null);
    const [analysisResults, setAnalysisResults] = useState({});
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('analysis');
    const [useEmotions, setUseEmotions] = useState(false);
    const [useColors, setUseColors] = useState(false);

    useEffect(() => {
        const googleUser = JSON.parse(localStorage.getItem('google_user'));
        const token = googleUser?.access_token || localStorage.getItem('google_access_token');

        if (!token) {
            setError('User not authenticated. Please login again.');
            return;
        }

        const fetchPhotos = async () => {
            try {
                const response = await axios.post('http://localhost:3001/api/photos', {
                    accessToken: token
                });
                setPhotos(response.data.photos);
            } catch (err) {
                console.error('Failed to fetch photos:', err);
                setError('Failed to load Google Photos.');
            }
        };

        fetchPhotos();
    }, []);

    const handleAnalyzePhoto = async (photoId, photoUrl) => {
        const googleUser = JSON.parse(localStorage.getItem('google_user'));
        const accessToken = googleUser?.access_token || localStorage.getItem('google_access_token');

        setSelectedPhoto({ id: photoId, url: photoUrl });
        setModalOpen(true);

        try {
            const response = await axios.post('http://localhost:3001/api/vision', {
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

    return (
        <div>
            <Navbar />
            <h2 className="text-center mt-3">Your Google Photos</h2>
            {error && <p className="text-danger text-center">{error}</p>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', padding: '20px' }}>
                {photos.map(photo => (
                    <div key={photo.id} style={{ textAlign: 'center', maxWidth: '220px' }}>
                        <img
                            src={`${photo.baseUrl}=w400`}
                            alt="Google Photo"
                            style={{ width: '100%', borderRadius: '8px' }}
                        />
                        <button
                            className="btn btn-sm btn-primary mt-2"
                            onClick={() => handleAnalyzePhoto(photo.id, photo.baseUrl)}
                        >
                            Analyze with Vision API
                        </button>
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
                            <img
                                src={`${selectedPhoto.url}=w400`}
                                alt="Selected"
                                style={{ width: '300px', borderRadius: '8px' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div>
                                    <button onClick={() => setActiveTab('analysis')}>Analysis</button>
                                    <button onClick={() => setActiveTab('restaurants')}>Restaurants</button>
                                    <button onClick={() => setActiveTab('recipes')}>Recipe</button>
                                </div>

                                <hr />
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
                                                {selectedData.labels.map((label, idx) => (
                                                    <li key={idx}>{label}</li>
                                                ))}
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
                                        <h5>Restaurants Tab (To be implemented)</h5>
                                    </div>
                                )}

                                {activeTab === 'recipes' && (
                                    <div>
                                        <h5>Recipe Tab (To be implemented)</h5>
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
