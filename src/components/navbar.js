import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../assets/styles/Navbar.css';
import picplateLogo from '../assets/images/picplate-logo.svg';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('google_user');
        localStorage.removeItem('google_access_token');
        navigate('/login');
    };

    const isProfilePage = location.pathname === '/profile';

    return (
        <header role="banner">
            <nav className="navbar navbar-expand-md navbar-dark bg-dark">
                <div className="container position-relative">
                    <Link className="navbar-brand d-flex align-items-center mx-auto" to="/">
                        <img
                            src={picplateLogo}
                            alt="PicPlate Logo"
                            className="mr-2"
                            style={{ height: '40px' }}
                        />
                        <span>PicPlate</span>
                    </Link>

                    <button
                        className="navbar-toggler position-absolute"
                        style={{ right: '10px' }}
                        type="button"
                        data-toggle="collapse"
                        data-target="#navbarsPicPlate"
                        aria-controls="navbarsPicPlate"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse justify-content-end" id="navbarsPicPlate">
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className="nav-link" to="/home">Home</Link>
                            </li>
                            {isProfilePage && user && (
                                <>
                                    <li className="nav-item nav-user">
                                        <span className="nav-link text-white">Hello {user.name || user.given_name}</span>
                                    </li>
                                    <li className="nav-item">
                                        <button className="btn btn-outline-light ml-2" onClick={handleLogout}>Logout</button>
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
