/**
 * Home.js - Main landing page component for PicPlate application
 * 
 * This component renders the home page of the PicPlate application, which includes:
 * - A hero section with the app logo and tagline
 * - An interactive info tile explaining the app's purpose and functionality
 * - A dish slider showcasing sample recipes with interactive controls
 * - A features section highlighting the technologies used
 * - A footer with contact information and links
 */

import React, { useState } from 'react'; // Core React and useState hook for state management
import { useNavigate } from 'react-router-dom'; // Navigation hook for routing
import Navbar from '../components/navbar'; // Navigation bar component
import '../assets/styles/Home.css'; // Styles for this component

// Image imports
import picplateLogo from '../assets/images/picplate-logo.svg'; // App logo
import dish2 from '../assets/images/dishes_2.jpg'; // Dish images for the slider
import dish3 from '../assets/images/dishes_3.jpg';
import dish5 from '../assets/images/dishes_5.jpg';
import googlePhotosLogo from '../assets/images/google-photos-icon.png'; // Technology logos
import visionApiLogo from '../assets/images/google-vision-api-logo.jpg';
import geminiLogo from '../assets/images/google-gemini-logo.png';
import firestoreLogo from '../assets/images/firestore-logo.png';

/**
 * Home component - Main landing page
 */
const Home = () => {
    // Navigation hook for programmatic routing
    const navigate = useNavigate();

    // State for slide management (unused but kept for future functionality)
    const [currentSlide, setCurrentSlide] = useState(0);

    // State for dish slider
    const [currentDish, setCurrentDish] = useState(0); // Index of currently displayed dish
    const [showRecipe, setShowRecipe] = useState(false); // Toggle between dish image and recipe

    /**
     * Sample dish data with recipes
     * Each dish object contains:
     * - name: The name of the dish
     * - image: Imported image file
     * - recipe: Text instructions for preparing the dish
     * - backgroundSize: CSS background-size property for image display
     * - backgroundPosition: CSS background-position property for image display
     */
    const dishes = [
        {
            name: "Vanilla Ice Cream with Berry Compote",
            image: dish5,
            recipe: "For the compote, combine mixed berries (like strawberries, blueberries, and raspberries) in a saucepan with a little sugar and a squeeze of lemon juice. Simmer over medium heat until the berries soften and release their juices, creating a syrupy sauce. Let the compote cool slightly. Serve warm or at room temperature over scoops of good quality vanilla ice cream. Garnish with fresh mint leaves if desired.",
            backgroundSize: "cover", // Fill the tile completely
            backgroundPosition: "center center" // Center the image
        },
        {
            name: "Lemon Garlic Shrimp Pasta",
            image: dish2,
            recipe: "Sauté shrimp with minced garlic in olive oil until pink. Deglaze the pan with a squeeze of lemon juice. Toss the cooked pasta (like spaghetti or linguine) into the pan with the shrimp and garlic. Add fresh parsley, lemon zest, and a bit of reserved pasta water to create a light, flavorful sauce. Season with salt and pepper to taste.",
            backgroundSize: "cover", // Fill the tile completely
            backgroundPosition: "center center" // Center the image
        },
        {
            name: "Mixed Green Salad",
            image: dish3,
            recipe: "Combine a variety of fresh lettuce (like romaine, butter, and red leaf) in a bowl. Add colorful vegetables such as cherry tomatoes (halved), sliced cucumbers, and shredded carrots. You can also include other additions like bell peppers or red onion. Toss gently with your favorite salad dressing just before serving to keep the greens crisp.",
            backgroundSize: "cover", // Fill the tile completely
            backgroundPosition: "bottom center" // Focus on the top of the salad
        }
    ];

    /**
     * Navigate to the next dish in the slider
     * Resets recipe view and increments the dish index with wraparound
     */
    const nextDish = () => {
        setShowRecipe(false); // Hide recipe when changing dishes
        setCurrentDish((prev) => (prev + 1) % dishes.length); // Increment with wraparound
    };

    /**
     * Navigate to the previous dish in the slider
     * Resets recipe view and decrements the dish index with wraparound
     */
    const prevDish = () => {
        setShowRecipe(false); // Hide recipe when changing dishes
        setCurrentDish((prev) => (prev - 1 + dishes.length) % dishes.length); // Decrement with wraparound
    };


    /**
     * Render the Home component
     * The component is structured into several sections:
     * 1. Navbar - Top navigation
     * 2. Hero Section - Logo and tagline
     * 3. Info Section - Interactive info tile and dish slider
     * 4. Features Section - Technologies used
     * 5. Footer - Contact information and links
     */
    return (
        <div className="home-page">
            {/* Navigation Bar */}
            <Navbar />

 {/* Hero Section with Logo and Tagline */}
            <div className="hero-section">
                <div className="container">
                    <div className="row align-items-center py-5">
                        {/* Logo Column */}
                        <div className="col-md-6 text-center text-md-end mb-4 mb-md-0">
                            <img
                                src={picplateLogo}
                                alt="PicPlate Logo"
                                className="img-fluid hero-logo"
                                style={{ maxHeight: '300px' }}
                            />
                        </div>
                        {/* Heading and Tagline Column */}
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
                        {/* Info Tile Column - Left side with flippable information card */}
                        <div className="col-md-6">
                            <div className="info-tile-container">
                                <div className="info-tile">
                                    {/* Welcome Content (Default View) - Visible by default */}
                                    <div className="info-tile-front">
                                        <h2>Welcome to PicPlate</h2>
                                        <p>
                                            PicPlate is an AI-powered food and restaurant recommendation platform created for educational purposes. Users can sign in securely with Google Photos to upload images. PicPlate analyzes mood, emotions, and visual elements from your photos to suggest personalized recipes and nearby restaurants.
                                        </p>
                                        <p className="hover-instruction"><small>Hover to see how it works</small></p>
                                    </div>

                                    {/* How It Works Content (Hover View) - Appears on hover */}
                                    <div className="info-tile-back">
                                        <h2>How It Works</h2>
                                        <ol className="text-start mx-auto">
                                            <li><strong>Login & Upload:</strong> Sign in securely using your Google account to access your Google Photos. Choose an image to upload for analysis.</li>
                                            <li><strong>Real-Time Mood Detection:</strong> Google Vision analyzes your image for facial expressions, emotions, and dominant colors. Faces are blurred automatically to protect privacy.</li>
                                            <li><strong>AI-Generated Recommendations:</strong> Google Gemini suggests healthy recipes and local dining options based on your mood and selected photo.</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Slide Deck Column - Right side with interactive dish slider */}
                        <div className="col-md-6">
                            <div className="slide-deck-container">
                                <div className="slide-deck">
                                    {/* Conditional rendering based on showRecipe state */}
                                    {!showRecipe ? (
                                        /* Dish Image View - Shows when showRecipe is false */
                                        <>
                                            {/* Background image of the current dish */}
                                            <div
                                                className="slide-image"
                                                style={{
                                                    backgroundImage: `url(${dishes[currentDish].image})`,
                                                    backgroundSize: dishes[currentDish].backgroundSize,
                                                    backgroundPosition: dishes[currentDish].backgroundPosition,
                                                    backgroundRepeat: 'no-repeat'
                                                }}
                                            ></div>
                                            {/* Dish name */}
                                            <h3 className="dish-title">{dishes[currentDish].name}</h3>
                                            {/* Toggle button to show recipe (+ symbol) */}
                                            <button
                                                className="toggle-button"
                                                onClick={() => setShowRecipe(true)}
                                                aria-label="Show recipe"
                                            >
                                                +
                                            </button>
                                        </>
                                    ) : (
                                        /* Recipe View - Shows when showRecipe is true */
                                        <div className="recipe-view">
                                            <h3 className="dish-title">{dishes[currentDish].name}</h3>
                                            <h4>Recipe</h4>
                                            <p>{dishes[currentDish].recipe}</p>
                                            {/* Toggle button to hide recipe (× symbol) */}
                                            <button
                                                className="toggle-button"
                                                onClick={() => setShowRecipe(false)}
                                                aria-label="Hide recipe"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation arrows for dish slider */}
                                <div className="slider-controls">
                                    <button onClick={prevDish} className="arrow-button" aria-label="Previous dish">‹</button>
                                    <button onClick={nextDish} className="arrow-button" aria-label="Next dish">›</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Showcases the technologies used in the application */}
            <section className="features-section">
                <div className="container">
                    <h2 className="text-center mb-5">Technologies We Use</h2>
                    <div className="row justify-content-center">
                        {/* Google Photos - For secure image access */}
                        <div className="col-md-3 mb-4">
                            <div className="feature-tile">
                                {/* Technology logo */}
                                <img src={googlePhotosLogo} alt="Google Photos" className="feature-logo" />
                                {/* Overlay with description - appears on hover */}
                                <div className="feature-overlay">
                                    <p>Upload and access your images securely from Google Photos.</p>
                                </div>
                            </div>
                        </div>

                        {/* Google Vision API - For image analysis */}
                        <div className="col-md-3 mb-4">
                            <div className="feature-tile">
                                {/* Technology logo */}
                                <img src={visionApiLogo} alt="Google Vision API" className="feature-logo" />
                                {/* Overlay with description - appears on hover */}
                                <div className="feature-overlay">
                                    <p>Analyze emotions, colors, and objects with Vision API.</p>
                                </div>
                            </div>
                        </div>

                        {/* Google Gemini - For AI-generated recommendations */}
                        <div className="col-md-3 mb-4">
                            <div className="feature-tile">
                                {/* Technology logo */}
                                <img src={geminiLogo} alt="Google Gemini" className="feature-logo" />
                                {/* Overlay with description - appears on hover */}
                                <div className="feature-overlay">
                                    <p>Get AI-generated food recipes and restaurant suggestions.</p>
                                </div>
                            </div>
                        </div>

                        {/* Google Firestore - For data storage */}
                        <div className="col-md-3 mb-4">
                            <div className="feature-tile">
                                {/* Technology logo */}
                                <img src={firestoreLogo} alt="Google Firestore" className="feature-logo" />
                                {/* Overlay with description - appears on hover */}
                                <div className="feature-overlay">
                                    <p>Securely store user analysis data and history with Firestore.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Section - Contains contact information, about us, and links */}
            <footer className="footer">
                <div className="container">
                    {/* Main footer content with three columns */}
                    <div className="row mb-5">
                        {/* About Us Column */}
                        <div className="col-md-4 footer-column">
                            <h3>About Us</h3>
                            <p>
                                PicPlate is an AI-driven platform that offers mood-based recipe recommendations and helps users
                                discover healthy dining options.
                            </p>
                        </div>

                        {/* Contact Us Column */}
                        <div className="col-md-4 footer-column">
                            <h3>Contact Us</h3>
                            <p className="footer-contact">
                                {/* Email links with mailto protocol */}
                                Email: <a href="mailto:abhate@horizon.csueastbay.edu" className="footer-email">abhate@horizon.csueastbay.edu</a><br/>
                                Email: <a href="mailto:kvijayaraj@horizon.csueastbay.edu" className="footer-email">kvijayaraj@horizon.csueastbay.edu</a>
                            </p>
                        </div>

                        {/* Quick Links Column */}
                        <div className="col-md-4 footer-column">
                            <h3>Quick Links</h3>
                            <ul className="list-unstyled footer-link">
                                <li><a href="/privacy-policy.html">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Copyright row */}
                    <div className="row">
                        <div className="col-12 text-center">
                            {/* Dynamic copyright year using JavaScript Date object */}
                            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

/**
 * Export the Home component as the default export
 * This makes it available for importing in other files
 */
export default Home;
