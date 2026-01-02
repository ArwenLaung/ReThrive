import "./Header.css";
import { useState } from "react";
import logo from "../assets/logo.svg";
import Login from "../assets/login-icon.svg?react";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <NavLink to="/" className="nav-link">
          About
        </NavLink>

        <NavLink to="/events" className="nav-link">
          Events
        </NavLink>

        <NavLink to="/marketplace" className="nav-link">
          Marketplace
        </NavLink>

        <NavLink to="/donation" className="nav-link">
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