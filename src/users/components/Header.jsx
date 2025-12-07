import "./Header.css";
import logo from "../assets/logo.svg";
import LoginIcon from "../assets/login-icon.svg?react";
import { useContext, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ScrollContext } from "../context/ScrollContext.jsx";

const Header = ({ activeLink, setActiveLink, setScrollTarget }) => {
  const { scrollToAbout, scrollToEvents } = useContext(ScrollContext);

  const location = useLocation();
  const navigate = useNavigate();

  // 🟢 Synchronize header state when navigating to external pages 🟢
  useEffect(() => {
    if (location.pathname !== "/") {
      const pathSegment = location.pathname.substring(1);
      const currentPageLink = pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1);

      // CRITICAL: If on /events/:id, set state to Events. Otherwise, use the page link.
      if (location.pathname.startsWith('/events/') || location.pathname.startsWith('/register/')) {
        setActiveLink({ group: "scroll", link: "Events" });
      } else if (activeLink.group === "scroll") {
        setActiveLink({ group: "page", link: currentPageLink });
      }
    }
  }, [location.pathname, activeLink.group, setActiveLink]);


  const handleScrollClick = (link) => {
    // 1. Set the scroll target state (used only when already on the home page)
    if (link === "About") scrollToAbout();
    if (link === "Events") scrollToEvents();

    // 2. CRITICAL NAVIGATION LOGIC (Fixes external clicks)
    if (location.pathname !== '/') {
      // Navigate using a URL parameter for guaranteed scroll after navigation
      navigate(`/?scroll_to=${link.toLowerCase()}`);
      return;
    }

    // 3. Set the active state only if we stay on the home page
    setActiveLink({ group: "scroll", link });
  };

  const handlePageClick = (link) => {
    setActiveLink({ group: "page", link });
  };

  // State to manage the visibility of the mobile menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={logo} alt="ReThrive Logo" />
      </div>

      <nav className={`nav-bar ${isMenuOpen ? 'show' : ''}`}>
        {/* Scroll links */}
        <button
          className={`nav-link ${activeLink?.group === "scroll" && activeLink?.link === "About" ? "active" : ""}`}
          onClick={() => { handleScrollClick("About"); setIsMenuOpen(false); }}
        >
          About
        </button>
        <button
          className={`nav-link ${activeLink?.group === "scroll" && activeLink?.link === "Events" ? "active" : ""}`}
          onClick={() => { handleScrollClick("Events"); setIsMenuOpen(false); }}
        >
          Events
        </button>

        {/* Page links */}
        <NavLink
          to="/marketplace"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => { handlePageClick("Marketplace"); setIsMenuOpen(false); }}
        >
          Marketplace
        </NavLink>
        <NavLink
          to="/donation"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => { handlePageClick("Donation"); setIsMenuOpen(false); }}
        >
          Donation
        </NavLink>

        {/* Mobile Login Button (using existing classes) */}
        <div className="mobile-login-button-container">
          <div className="login mobile-login">
            <NavLink
              to="/login"
              className="login-button"
              onClick={() => { handlePageClick("Login"); setIsMenuOpen(false); }}
            >
              <LoginIcon className="login-icon" />
              Log In
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="login desktop-login">
        <NavLink
          to="/login"
          className="login-button">
          <LoginIcon className="login-icon" />
          Log In
        </NavLink>
      </div>

      <button className={`hamburger ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
};

export default Header;