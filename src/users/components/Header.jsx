import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ChevronDown, LogOut, User, Gift, Package, ShoppingBag } from 'lucide-react';
import { auth } from '../../firebase';
// 🟢 CHANGED: Import onIdTokenChanged instead of onAuthStateChanged
import { onIdTokenChanged, signOut } from 'firebase/auth';
import ReThriveLogo from '../assets/logo.svg';
import DefaultProfilePic from '../assets/default_profile_pic.jpg'; 
import './Header.css';

const Header = ({ activeLink }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const mobileProfileRef = useRef(null);

  // 🟢 FIX 1: Use onIdTokenChanged to detect profile updates (name/photo changes)
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      if (currentUser) {
        // 🟢 Force a new object reference so React detects the change
        setUser({ ...currentUser }); 
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Click Outside Logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('.profile-btn')) return;
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        mobileProfileRef.current && !mobileProfileRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  // 🟢 FIX 2: Check for displayName FIRST. Previous code ignored it.
  const getUsername = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return "Student";
  };

  // Helper: Smooth Scroll for Anchors
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // NAVIGATION HANDLER
  const handleNavClick = (path, hash) => {
    setIsMobileMenuOpen(false);

    if (!hash) {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    if (location.pathname === '/') {
      scrollToSection(hash);
    } else {
      navigate('/');
      setTimeout(() => {
        scrollToSection(hash);
      }, 100);
    }
  };

  const handleLinkClick = (path) => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const navItems = [
    { label: 'About', path: '/', hash: 'about' },
    { label: 'Events', path: '/', hash: 'events' },
    { label: 'Marketplace', path: '/marketplace', hash: null },
    { label: 'Donation', path: '/donationcorner', hash: null },
  ];

  const toggleDropdown = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    setIsDropdownOpen((prev) => !prev);
  };

  const renderAuthSection = (isMobile = false) => {
    if (!user) {
      return (
        <Link 
          to="/login" 
          className="login-button" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <LogIn size={18} /> Log In
        </Link>
      );
    }

    return (
      <div 
        className={`profile-container ${isMobile ? 'mobile-profile' : ''}`}
        ref={isMobile ? mobileProfileRef : dropdownRef}
      >
        <button className="profile-btn" onClick={toggleDropdown}>
          {/* 🟢 FIX 3: Ensure photoURL updates immediately */}
          <img src={user.photoURL || DefaultProfilePic} alt="Profile" className="profile-avatar" />
          <span className="profile-name">{getUsername()}</span>
          <ChevronDown size={16} className={`profile-arrow ${isDropdownOpen ? 'open' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className={`dropdown-menu ${isMobile ? 'mobile-dropdown' : ''}`}>
            <div className="dropdown-header">
              <p className="d-name">{getUsername()}</p>
              <p className="d-email">{user.email}</p>
            </div>

            <div className="dropdown-links">
              <button className="dropdown-item" onClick={() => handleLinkClick('/myaccount')}>
                <User size={16} /> My Account
              </button>
              <button className="dropdown-item" onClick={() => handleLinkClick('/myrewards')}>
                <Gift size={16} /> Missions & Rewards
              </button>
              <button className="dropdown-item" onClick={() => handleLinkClick('/mylistings')}>
                <Package size={16} /> My Listings
              </button>
              <button className="dropdown-item" onClick={() => handleLinkClick('/purchasehistory')}>
                <ShoppingBag size={16} /> My Purchases
              </button>
            </div>

            <div className="dropdown-footer">
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/"><img src={ReThriveLogo} alt="ReThrive@USM" /></Link>
      </div>

      <nav className={`nav-bar ${isMobileMenuOpen ? 'show' : ''}`}>
        {navItems.map((item) => {
          let isActive = false;
          if (item.hash) {
            isActive = location.pathname === '/' && activeLink?.link === item.label;
          } else {
            isActive = location.pathname === item.path;
          }

          return (
            <button
              key={item.label}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path, item.hash)}
            >
              {item.label}
            </button>
          );
        })}
        
        <div className="mobile-auth-container">
          <div className="mobile-divider"></div>
          {renderAuthSection(true)}
        </div>
      </nav>

      <button className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <span></span><span></span><span></span>
      </button>

      <div className="desktop-auth-container">
        {renderAuthSection(false)}
      </div>
    </header>
  );
};

export default Header;