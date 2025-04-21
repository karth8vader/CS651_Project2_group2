import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/Navbar.css'; // For your custom navbar styles
import picplateLogo from '../assets/images/picplate-logo.svg'; // Update the path if needed

const Navbar = () => {
    return (
        <header role="banner">
            <nav className="navbar navbar-expand-md navbar-light bg-dark">
                {/*
          position-relative allows us to absolutely position the toggler,
          while the brand sits centrally (mx-auto)
        */}
                <div className="container position-relative">

                    {/* Centered brand */}
                    <Link className="navbar-brand d-flex align-items-center mx-auto" to="/">
                        <img
                            src={picplateLogo}
                            alt="PicPlate Logo"
                            className="mr-2"
                            style={{ height: '40px' }}
                        />
                        <span>PicPlate</span>
                    </Link>

                    {/* Navbar Toggler (Hamburger) on the top-right */}
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

                    {/* Collapsible nav items, aligned to the right when expanded */}
                    <div className="collapse navbar-collapse justify-content-end" id="navbarsPicPlate">
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className="nav-link" to="/home">Home</Link>
                            </li>
                            {/* Add more nav links if desired */}
                        </ul>
                    </div>

                </div>
            </nav>
        </header>
    );
};

export default Navbar;
