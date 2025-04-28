import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../assets/styles/Navbar.css';
import picplateLogo from '../assets/images/picplate-logo.svg';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('google_user');
        localStorage.removeItem('google_access_token');
        navigate('/login');
    };


    return (
        <header role="banner">
            <nav className="navbar navbar-expand-md navbar-dark bg-custom-brown">
                <div className="container position-relative">
                    <Link className="navbar-brand d-flex align-items-center mx-auto" to="/">
                        <img
                            src={picplateLogo}
                            alt="PicPlate Logo"
                            className="mr-2"
                            style={{ height: '40px' }}
                        />
                        {/* Show "PicPlate" text only if not on Home */}
                        {location.pathname !== '/' && (
                            <span className="ms-2">PicPlate</span>
                        )}
                    </Link>

                    <button
                        className="navbar-toggler position-absolute"
                        style={{ right: '10px' }}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarsPicPlate"
                        aria-controls="navbarsPicPlate"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse justify-content-end" id="navbarsPicPlate">
                        <ul className="navbar-nav">
                            {!user && (
                                <li className="nav-item">
                                    <button className="btn btn-turquoise rounded-pill ms-2" onClick={() => navigate('/login')}>Login</button>
                                </li>
                            )}
                            {user && (
                                <>
                                    <li className="nav-item nav-user">
                                        <span className="nav-link text-white" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>Hello {user.name || user.given_name}</span>
                                    </li>
                                    <li className="nav-item">
                                        <button className="btn btn-turquoise rounded-pill ms-2" onClick={handleLogout}>Logout</button>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
