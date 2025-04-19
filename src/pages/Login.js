import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import '../assets/styles/Login.css';
import Navbar from '../components/navbar';
import picplateLogo from '../assets/images/picplate-logo.png';
import googlePhotosLogo from '../assets/images/google-photos-icon.png';
import Img1 from '../assets/images/Img1.jpg';
import Img2 from '../assets/images/Img2.jpg';
import Img4 from '../assets/images/Img4.jpg';
import Img5 from '../assets/images/Img5.jpg';
import Img6 from '../assets/images/Img6.jpg';
import Img7 from '../assets/images/Img7.jpg';
import Img8 from '../assets/images/Img8.jpg';
import Img9 from '../assets/images/Img9.jpg';

const floatingImages = [
    { path: Img1, top: '-10%', left: '1%', speed: 0.08 },
    { path: Img2, top: '20%', left: '20%', speed: 0.03 },
    { path: Img4, top: '53%', left: '40%', speed: 0.065 },
    { path: Img5, top: '65%', left: '1%', speed: 0.04 },
    { path: Img6, top: '-10%', left: '47%', speed: 0.025 },
    { path: Img7, top: '3%', left: '90%', speed: 0.025 },
    { path: Img8, top: '25%', left: '69%', speed: 0.03 },
    { path: Img9, top: '77%', left: '80%', speed: 0.04 }
];


const Login = () => {
    const navigate = useNavigate();
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            document.querySelectorAll(".image-wrapper").forEach((image, index) => {
                const x = (e.clientX - window.innerWidth / 2) * floatingImages[index].speed;
                const y = (e.clientY - window.innerHeight / 2) * floatingImages[index].speed;
                gsap.to(image, {
                    x,
                    y,
                    duration: 1,
                    ease: "power1.out",
                    overwrite: true
                });
            });
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate('/home');
    };

    const handleGooglePhotosLogin = () => {
        navigate('/home');
    };

    return (
        <div className="login-page">
            <Navbar />
            <div className="main-content scrollable">
                {!showLogin && (
                    <header className={`hero-center ${showLogin ? 'fade-out' : ''}`}>
                        <h1 className="hero-title">Login to <span>PicPlate</span></h1>
                        <button onClick={() => setShowLogin(true)} className="get-started-btn">Login</button>
                    </header>
                )}

                {showLogin && (
                    <section className="login-dialog fade-in">
                        <div className="login-box">
                            <div className="text-center mb-4">
                                <img src={picplateLogo} alt="PicPlate Logo" className="login-logo" />
                            </div>
                            <h2 className="text-center">Login</h2>
                            <form onSubmit={handleSubmit} className="mt-3">
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" className="form-control" placeholder="Enter Email" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <input type="password" id="password" className="form-control" placeholder="Enter Password" required />
                                </div>
                                <button type="submit" className="btn btn-primary btn-block mt-4">Login</button>
                            </form>
                            <div className="or-separator my-4">
                                <span>OR</span>
                            </div>
                            <button type="button" onClick={handleGooglePhotosLogin} className="btn btn-outline-primary btn-block">
                                <img src={googlePhotosLogo} alt="Google Photos" className="social-icon" />
                                Sign in with Google Photos
                            </button>
                        </div>
                    </section>
                )}
            </div>

            <div id="gallery">
                {floatingImages.map((item, index) => (
                    <div
                        key={index}
                        className="image-wrapper"
                        style={{ top: item.top, left: item.left }}
                    >
                        <img src={item.path} alt={`bg-${index}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Login;