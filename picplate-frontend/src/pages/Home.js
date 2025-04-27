import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import '../assets/styles/Home.css';
import picplateLogo from '../assets/images/picplate-logo.svg';
import dish1 from '../assets/images/dishes_1.jpg';
import dish2 from '../assets/images/dishes_2.jpg';
import dish3 from '../assets/images/dishes_3.jpg';
import dish4 from '../assets/images/dishes_4.jpg';

const Home = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const menuItems = [
        { name: 'Baked new Zealand mussels',  image: dish1 },
        { name: 'Seared ahi tuna fillet & honey-ginger sauce',  image: dish3 },
        { name: 'Spicy meatballs',  image: dish4 },
        { name: 'Baked broccoli',  image: dish2 },
    ];

    return (
        <div className="home-page">
            <Navbar />

            {/* Hero Section with Logo */}
            <div className="hero-section" style={{ paddingTop: '80px' }}>
                <div className="container">
                    <div className="row align-items-center py-5">
                        <div className="col-md-6 text-center text-md-end mb-4 mb-md-0">
                            <img 
                                src={picplateLogo} 
                                alt="PicPlate Logo" 
                                className="img-fluid hero-logo" 
                                style={{ maxHeight: '300px' }}
                            />
                        </div>
                        <div className="col-md-6 text-center text-md-start">
                            <h1 className="display-4 fw-bold">PicPlate</h1>
                            <p className="lead">Your AI-powered food and restaurant recommendation platform</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Info Tile and Slide Deck Section */}
            <section className="white-section">
                <div className="container" style={{ maxWidth: '1200px' }}>
                    <div className="row">
                        {/* Info Tile Column */}
                        <div className="col-md-6">
                            <div className="info-tile-container">
                                <div className="info-tile">
                                    {/* Welcome Content (Default View) */}
                                    <div className="info-tile-front">
                                        <h2>Welcome to PicPlate</h2>
                                        <p>
                                            PicPlate is an AI-powered food and restaurant recommendation platform designed for educational purposes. By analyzing the mood and visual elements in uploaded images, PicPlate helps you discover healthy recipes and nearby restaurants that match your vibe.
                                        </p>
                                        <p>
                                            <strong>Note:</strong> PicPlate is an independent project and is not affiliated with or endorsed by Pinterest. We do not store Pinterest credentials or any uploaded images.
                                        </p>
                                        <p className="hover-instruction"><small>Hover to see how it works</small></p>
                                    </div>

                                    {/* How It Works Content (Hover View) */}
                                    <div className="info-tile-back">
                                        <h2>How It Works</h2>
                                        <ol className="text-start mx-auto">
                                            <li><strong>Login & Upload:</strong> Sign in using Google or email. Connect Pinterest (optional) to upload your selected images. We only access the images you explicitly choose to share.</li>
                                            <li><strong>Real-Time Mood Detection:</strong> Google Vision analyzes your image for facial expressions, emotions, and dominant colors. Faces are blurred automatically to protect privacy.</li>
                                            <li><strong>AI-Generated Recommendations:</strong> Google Gemini creates healthy recipe suggestions and identifies local dining spots based on your mood and location.</li>
                                        </ol>
                                        <p><small>PicPlate is built as an academic research tool. We do not store your Pinterest credentials, and uploaded content is processed in real-time without being permanently saved.</small></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Slide Deck Column */}
                        <div className="col-md-6">
                            <div className="slide-deck-container">
                                <div className="slide-deck">
                                    <div className="slide-image" style={{ backgroundImage: `url(${menuItems[currentSlide].image})` }}></div>
                                    <div className="slide-navigation">
                                        <button 
                                            className="nav-arrow prev-arrow" 
                                            onClick={() => setCurrentSlide((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1))}
                                            aria-label="Previous slide"
                                        >
                                            &#10094;
                                        </button>
                                        <button 
                                            className="nav-arrow next-arrow" 
                                            onClick={() => setCurrentSlide((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1))}
                                            aria-label="Next slide"
                                        >
                                            &#10095;
                                        </button>
                                    </div>
                                    <div className="slide-indicators">
                                        {menuItems.map((_, idx) => (
                                            <span 
                                                key={idx} 
                                                className={`slide-dot ${idx === currentSlide ? 'active' : ''}`}
                                                onClick={() => setCurrentSlide(idx)}
                                            ></span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

    {/* Footer Section */
    }
    <footer className="footer">
        <div className="container">
            <div className="row mb-5">
                {/* About Us */}
                <div className="col-md-4 footer-column">
                    <h3>About Us</h3>
                    <p>
                        PicPlate is an AI-driven platform that offers mood-based recipe recommendations and helps users
                        discover healthy dining options.
                    </p>
                        </div>
                        {/* Contact Us */}
                        <div className="col-md-4 footer-column">
                            <h3>Contact Us</h3>
                            <p className="footer-contact">
                                Email: <a href="mailto:abhate@horizon.csueastbay.edu">abhate@horizon.csueastbay.edu</a>
                            </p>
                        </div>
                        {/* Quick Links */}
                        <div className="col-md-4 footer-column">
                            <h3>Quick Links</h3>
                            <ul className="list-unstyled footer-link">
                                <li><a href="/">Home Page</a></li>
                                <li><a href="/privacy-policy.html">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-12 text-center">
                            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
