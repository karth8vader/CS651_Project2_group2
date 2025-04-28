// frontend/src/pages/login.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import '../assets/styles/Login.css';
import Navbar from '../components/navbar';
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

const URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Login = () => {
    const navigate = useNavigate();

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
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const handleGooglePhotosLogin = useGoogleLogin({
        flow: 'implicit',
        scope: 'https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
        onSuccess: async (tokenResponse) => {
            console.log('Google token response:', tokenResponse);
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            localStorage.setItem('google_user', JSON.stringify(tokenResponse));

            try {
                const { data } = await axios.post(`${URL}/api/auth/login`, {
                    accessToken: tokenResponse.access_token,
                });
                localStorage.setItem('user', JSON.stringify(data.user));
            } catch (err) {
                console.error('Google user save failed', err);
            }

            navigate('/profile');
        },
        onError: () => {
            console.error('Google Login Failed');
        }
    });

    return (
        <div className="login-page">
            <Navbar />
            <div className="main-content scrollable" style={{ paddingTop: '80px' }}>
                <header className="hero-center">
                    <h1 className="hero-title">Login to <span>PicPlate</span></h1>
                    <button onClick={handleGooglePhotosLogin} className="get-started-btn">
                        <img src={googlePhotosLogo} alt="Google Photos" className="social-icon" />
                        Sign in with Google Photos
                    </button>
                </header>
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
