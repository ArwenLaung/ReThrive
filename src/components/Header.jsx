import "./Header.css";
import { useState } from "react";
import logo from "../assets/logo.svg";
import Login from "../assets/login-icon.svg?react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (sectionId) => {
    if (location.pathname === '/') {
      // Already on home page, just scroll
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home first
      navigate('/');
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={logo} alt=" ReThrive Logo" />
      </div>

      <button
        className={`hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`nav-bar ${menuOpen ? "show" : ""}`}>
        <button
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            handleSectionClick('about');
            setMenuOpen(false);
          }}
        >
          About
        </button>

        <button
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            handleSectionClick('events');
            setMenuOpen(false);
          }}
        >
          Events
        </button>

        <NavLink to="/marketplace" className="nav-link">
          Marketplace
        </NavLink>

        <NavLink to="/donationcorner" className="nav-link">
          Donation
        </NavLink>

        <div className="mobile-login-button-container">
          <button className="login-button mobile-login">
            <Login className="login-icon" />
            Log In
          </button>
        </div>
      </nav>

      <div className="login desktop-login" >
        <button className="login-button">
          <Login className="login-icon" />
          Log In
        </button>
      </div>
    </header >
  );
}

export default Header;