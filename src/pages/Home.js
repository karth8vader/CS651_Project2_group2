import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import '../assets/styles/Home.css';
import hero1 from '../assets/images/hero_login.jpg';
import hero2 from '../assets/images/hero_2.jpg';
import dish1 from '../assets/images/dishes_1.jpg';
import dish2 from '../assets/images/dishes_2.jpg';
import dish3 from '../assets/images/dishes_3.jpg';
import dish4 from '../assets/images/dishes_4.jpg';

const Home = () => {
    const navigate = useNavigate();
    const [activeSlide, setActiveSlide] = useState(0);
    const sliderImages = [hero1, hero2];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % sliderImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        { name: 'Baked new Zealand mussels',  image: dish1 },
        { name: 'Seared ahi tuna fillet & honey-ginger sauce',  image: dish3 },
        { name: 'Spicy meatballs',  image: dish4 },
        { name: 'Baked broccoli',  image: dish2 },
    ];

    return (
        <div className="home-page">
            <Navbar />

            {/* Slider Section */}
            <div className="slider-wrap">
                <section className="home-slider">
                    {sliderImages.map((img, idx) => (
                        <div
                            key={idx}
                            className={`slider-item ${idx === activeSlide ? 'active' : ''}`}
                            style={{ backgroundImage: `url(${img})` }}
                        >
                            <div className="text-center">
                                <h1 className="slider-heading animated-text">{idx === 0 ? 'Eat, Drink at Gourmet' : 'Enjoy delicious food at Gourmet'}</h1>
                                <button onClick={() => navigate('/login')} className="btn btn-outline-white mt-3">Login</button>
                            </div>
                        </div>
                    ))}
                    <div className="custom-shape-divider-bottom">
                        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
                            <path d="M0,0V46.29c47.74,22.19,106.29,32.05,158,28,70-5.47,136-33.69,206-38,72.46-4.45,147.76,17.11,218,35,69.1,17.63,138.77,30.25,209,27,66.49-3.09,130.43-21.36,189-46V0Z" opacity=".25" className="shape-fill"></path>
                            <path d="M0,0V15.81C47.42,40.69,103.76,54,158,52,228,49.52,294.2,26.35,364,22c71.45-4.48,141.76,15.78,212,35,65.92,18.13,132.48,30.31,200,26,58.31-3.72,113.48-20.3,166-39.8V0Z" opacity=".5" className="shape-fill"></path>
                            <path d="M0,0V5.63C43,27.91,96,50.25,158,53c72.39,3.28,142.53-18.48,212-35,67.06-16,138.2-24.88,209-15,61,8.64,113.52,30.85,173,39,59.43,8.14,122.36,6.55,179-7V0Z" className="shape-fill"></path>
                        </svg>
                    </div>
                </section>
            </div>

            {/* Description Section - White Slanted */}
            <section className="white-section">
                <div className="container text-center">
                    <h2>Welcome to PicPlate</h2>
                    <p>
                        PicPlate is your AI-powered food and restaurant recommender. Based on your mood or any uploaded photo,
                        our app uses intelligent analysis of your shared social photos to suggest the perfect meal or
                        place to dine. Whether you’re feeling joyful, calm, or excited – we’ve got the taste for your vibe!
                    </p>
                    <h3 className="mt-4 mb-3">How It Works</h3>
                    <ol className="text-start mx-auto" style={{ maxWidth: '700px' }}>
                        <li><strong>Login & Connect:</strong> Sign in and connect Pinterest to upload photos.</li>
                        <li><strong>AI-Powered Analysis:</strong> Google Vision detects mood and facial features (faces are blurred for privacy).</li>
                        <li><strong>Smart Suggestions:</strong> Gemini API and Google Maps recommend dishes and restaurants near you.</li>
                    </ol>
                    <p><small>This project is built purely for academic use. No personal data is stored.</small></p>
                </div>
            </section>

            {/* Menu Grid Section - Gray Slanted */}
            <section className="gray-section py-4">
                <div className="container">
                    <div className="row mb-4">
                        <div className="col-md-12 text-center">
                            <h2 className="menu-heading">Some Exotic Food</h2>
                        </div>
                    </div>
                    <div className="menu-carousel">
                        {menuItems.map((dish, idx) => (
                            <div className="menu-tile" key={idx}>
                                <div className="menu-image" style={{ backgroundImage: `url(${dish.image})` }}></div>
                                <div className="menu-info">
                                    <h5 className="dish-name">{dish.name}</h5>
                                </div>
                            </div>
                        ))}
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