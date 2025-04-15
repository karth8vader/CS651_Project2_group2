import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Navbar from '../components/navbar.js';
import '../assets/styles/Login.css';
import heroLogin from '../assets/images/hero_login.jpg';
import picplateLogo from '../assets/images/picplate-logo.png';
import pinterestIcon from '../assets/images/pinterest-icon.png';


const Login = () => {
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({ duration: 1000 });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: Add your authentication logic or Pinterest OAuth call here
        navigate('/home'); // Simulate successful login
    };

    const handlePinterestLogin = () => {
        // TODO: Replace with Pinterest OAuth flow when ready
        navigate('/home');
    };

    return (
        <div className="login-page">
            <Navbar />

            {/* HERO SECTION */}
            <div
                className="login-hero"
                style={{
                    backgroundImage: `url(${heroLogin})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center 20%', // centers horizontally, shifts vertically (20% from top)
                    backgroundRepeat: 'no-repeat',
                    minHeight: '100vh', // Adjust this value for the desired hero height
                }}
            >
                <div className="hero-overlay d-flex align-items-center justify-content-center">
                    {/* Include the block from the gourmet Contact Us page */}
                    <div className="text-center">
                            <h1 className="hero-title" data-aos="fade-up">Login To PicPlate</h1>
                            <p className="hero-subtitle mb-5" data-aos="fade-up" data-aos-delay="100">
                                Your AI-Powered Mood-Based Recipe &amp; Restaurant Recommender
                            </p>
                    </div>
                </div>
            </div>

            {/* SLANTED LOGIN SECTION */}
            <section className="login-slant-section">
                <div className="container">
                    <div className="login-box">
                        <div className="text-center mb-4">
                            <img src={picplateLogo} alt="PicPlate Logo" className="login-logo" />
                        </div>
                        <h2 className="text-center">Login</h2>
                        <form onSubmit={handleSubmit} className="mt-3">
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-control"
                                    placeholder="Enter Email"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-control"
                                    placeholder="Enter Password"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block mt-4">
                                Login
                            </button>
                        </form>
                        <div className="or-separator my-4">
                            <span>OR</span>
                        </div>
                        <button
                            type="button"
                            onClick={handlePinterestLogin}
                            className="btn btn-outline-primary btn-block"
                        >
                            <img
                                src={pinterestIcon}
                                alt="Pinterest"
                                className="pinterest-icon"
                            />
                            Login with Pinterest
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER SECTION IN SLANTED GRAY BACKGROUND */}
            <footer className="slant-gray-footer">
                <div className="container">
                    <div className="row mb-5">
                        {/* About Us */}
                        <div className="col-md-4 footer-column">
                            <h3>About Us</h3>
                            <p>
                                PicPlate is an AI-driven platform that offers mood-based recipe recommendations and helps users discover healthy dining options.
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


export default Login;
