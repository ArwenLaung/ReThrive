import "./Header.css";
import logo from "../assets/logo.svg";
import LoginIcon from "../assets/login-icon.svg?react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const Header = ({ activeLink, setActiveLink }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // when NOT on homepage, highlight page
    if (location.pathname !== "/") {
      const path = location.pathname.substring(1);

      // event detail or registration still belongs to Events
      if (location.pathname.startsWith("/events/") || location.pathname.startsWith("/register/")) {
        setActiveLink({ group: "page", link: "Events" });
      } else {
        setActiveLink({ group: "page", link: path.charAt(0).toUpperCase() + path.slice(1) });
      }
    }
  }, [location.pathname]);

  const handleScrollClick = (target) => {
    navigate(`/?scroll_to=${target.toLowerCase()}`);
    setActiveLink({ group: "scroll", link: target });
    setIsMenuOpen(false);
  };

  const handlePageClick = (link) => {
    setActiveLink({ group: "page", link });
    setIsMenuOpen(false);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="header">
      <div className="logo">
        <img src={logo} alt="ReThrive Logo" />
      </div>

      <nav className={`nav-bar ${isMenuOpen ? "show" : ""}`}>
        <button
          className={`nav-link ${activeLink?.group === "scroll" && activeLink?.link === "About" ? "active" : ""}`}
          onClick={() => handleScrollClick("About")}
        >
          About
        </button>

        <button
          className={`nav-link ${activeLink?.group === "scroll" && activeLink?.link === "Events" ? "active" : ""}`}
          onClick={() => handleScrollClick("Events")}
        >
          Events
        </button>

        <NavLink
          to="/marketplace"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => handlePageClick("Marketplace")}
        >
          Marketplace
        </NavLink>

        <NavLink
          to="/donation"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => handlePageClick("Donation")}
        >
          Donation
        </NavLink>

        <div className="mobile-login-button-container">
          <div className="login mobile-login">
            <NavLink
              to="/login"
              className="login-button"
              onClick={() => handlePageClick("Login")}
            >
              <LoginIcon className="login-icon" />
              Log In
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="login desktop-login">
        <NavLink to="/login" className="login-button">
          <LoginIcon className="login-icon" />
          Log In
        </NavLink>
      </div>

      <button
        className={`hamburger ${isMenuOpen ? "open" : ""}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
};

export default Header;