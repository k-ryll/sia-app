import React, { useContext } from 'react'
import logo1 from '../assets/logo1.svg';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';

function Navbar() {
  const { translations } = useContext(LanguageContext);

  return (
     <nav className="navbar">
            <div className="logo">
              <a href="home.html">
                <img src={logo1} alt="gabaylakbay Logo" />
              </a>
            </div>
            <div className="nav-profile-container">
              <div className="navigation">
      <Link to="/">{translations['home'] || 'Home'}</Link>
      <Link to="/settings">{translations['settings'] || 'Settings'}</Link>
    </div>
            </div>
          </nav>)
}

export default Navbar