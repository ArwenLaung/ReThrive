import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ChevronDown, LogOut, User, Gift, Package, ShoppingBag, ShoppingCart, MessageCircle, Bell, Heart } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
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
  const [notifItems, setNotifItems] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const mobileProfileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ ...currentUser }); 
      } else {
        setUser(null);
        setNotifItems([]);
        setIsNotifOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = notifItems.length;

  // Listen for unread chats for this user (buyer or seller)
// Listen for unread chats (Marketplace + Donations)
  useEffect(() => {
    if (!user?.uid) {
      setNotifItems([]);
      return;
    }

    const uid = user.uid;

    // --- MARKETPLACE QUERIES (Existing) ---
    const itemChatsBuyerQ = query(
      collection(db, 'itemChats'),
      where('buyerId', '==', uid),
      where('unreadForBuyer', '==', true)
    );
    const itemChatsSellerQ = query(
      collection(db, 'itemChats'),
      where('sellerId', '==', uid),
      where('unreadForSeller', '==', true)
    );
    const ordersBuyerQ = query(
      collection(db, 'orders'),
      where('buyerId', '==', uid),
      where('unreadForBuyer', '==', true)
    );
    const ordersSellerQ = query(
      collection(db, 'orders'),
      where('sellerId', '==', uid),
      where('unreadForSeller', '==', true)
    );

    // --- DONATION QUERIES (New - using collectionGroup) ---
    // This finds 'threads' subcollections anywhere in the DB
    const donationDonorQ = query(
      collectionGroup(db, 'threads'),
      where('donorId', '==', uid),
      where('unreadForDonor', '==', true)
    );

    const donationReceiverQ = query(
      collectionGroup(db, 'threads'),
      where('receiverId', '==', uid),
      where('unreadForReceiver', '==', true)
    );

    const buckets = {
      buyerItems: [],
      sellerItems: [],
      buyerOrders: [],
      sellerOrders: [],
      donorItems: [],      // New bucket
      receiverItems: []    // New bucket
    };

    const recompute = () => {
      const merged = [
        ...buckets.buyerItems,
        ...buckets.sellerItems,
        ...buckets.buyerOrders,
        ...buckets.sellerOrders,
        ...buckets.donorItems,    // Include donations
        ...buckets.receiverItems  // Include donations
      ];
      merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifItems(merged);
    };

    // --- LISTENERS ---

    const unsubItemBuyer = onSnapshot(itemChatsBuyerQ, (snap) => {
      buckets.buyerItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: 'itemChat',
          role: 'buyer',
          title: data.itemTitle || 'Marketplace item',
          subtitle: data.sellerName || 'Seller',
          route: `/chat-item/${data.itemId}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    const unsubItemSeller = onSnapshot(itemChatsSellerQ, (snap) => {
      buckets.sellerItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: 'itemChat',
          role: 'seller',
          title: data.itemTitle || 'Marketplace item',
          subtitle: data.buyerName || 'Buyer',
          route: `/chat-item/${data.itemId}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    const unsubOrdersBuyer = onSnapshot(ordersBuyerQ, (snap) => {
      buckets.buyerOrders = snap.docs.map((d) => {
        const data = d.data();
        const chatId = `${data.itemId}_${data.buyerId}`;
        return {
          id: chatId,
          type: 'itemChat',
          role: 'buyer',
          title: data.itemTitle || 'Order',
          subtitle: data.sellerName || 'Seller',
          route: `/chat-item/${data.itemId}?chatId=${encodeURIComponent(chatId)}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    const unsubOrdersSeller = onSnapshot(ordersSellerQ, (snap) => {
      buckets.sellerOrders = snap.docs.map((d) => {
        const data = d.data();
        // Since we are only looking at 'orders', we stick to marketplace logic here
        return {
          id: `${data.itemId}_${data.buyerId}`,
          type: 'itemChat',
          role: 'seller',
          title: data.itemTitle || 'Order',
          subtitle: data.buyerName || 'Buyer',
          route: `/chat-item/${data.itemId}?chatId=${encodeURIComponent(`${data.itemId}_${data.buyerId}`)}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    // --- NEW DONATION LISTENERS ---
    
    const unsubDonationDonor = onSnapshot(donationDonorQ, (snap) => {
      buckets.donorItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: 'donationChat',
          role: 'donor',
          title: data.donationTitle || 'Donation',
          subtitle: data.receiverName || 'Receiver',
          // Important: Link to the specific donation page to open chat
          route: `/chat-donation/${data.donationId}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    const unsubDonationReceiver = onSnapshot(donationReceiverQ, (snap) => {
      buckets.receiverItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: 'donationChat',
          role: 'receiver',
          title: data.donationTitle || 'Donation',
          subtitle: data.donorName || 'Donor',
          route: `/chat-donation/${data.donationId}`,
          createdAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
        };
      });
      recompute();
    });

    return () => {
      unsubItemBuyer();
      unsubItemSeller();
      unsubOrdersBuyer();
      unsubOrdersSeller();
      unsubDonationDonor();
      unsubDonationReceiver();
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('.profile-btn')) return;
      if (event.target.closest('.notif-btn')) return;
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        mobileProfileRef.current && !mobileProfileRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
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

  const getUsername = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return "Student";
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    { label: 'Donation', path: '/donation', hash: null },
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
      <div className="auth-with-notification">
        {/* Notification bell */}
        <div className="notif-container" ref={notifRef}>
          <button
            type="button"
            className="notif-btn"
            onClick={() => setIsNotifOpen((prev) => !prev)}
          >
            <div className="notif-icon-wrapper">
              <Bell size={18} className="notif-icon" />
              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
          {isNotifOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-title">Messages</span>
                {unreadCount > 0 && (
                  <span className="notif-count">{unreadCount}</span>
                )}
              </div>
              {notifItems.length === 0 ? (
                <div className="notif-empty">No new messages</div>
              ) : (
                <div className="notif-list">
                  {notifItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}-${item.role}`}
                      className="notif-item"
                      onClick={() => {
                        // Close dropdown and optimistically clear this notification
                        setIsNotifOpen(false);
                        setNotifItems((prev) =>
                          prev.filter(
                            (n) =>
                              !(
                                n.id === item.id &&
                                n.type === item.type &&
                                n.role === item.role
                              )
                          )
                        );
                        handleLinkClick(item.route);
                      }}
                    >
                      <div className="notif-item-main">
                        <span className="notif-item-title">
                          {item.title}
                        </span>
                        <span className="notif-item-subtitle">
                          {item.subtitle}
                        </span>
                      </div>
                      <span className="notif-item-tag">
                        {item.type === 'itemChat' ? 'Item' : 'Order'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div 
          className={`profile-container ${isMobile ? 'mobile-profile' : ''}`}
          ref={isMobile ? mobileProfileRef : dropdownRef}
        >
          <button className="profile-btn" onClick={toggleDropdown}>
            <div className="profile-avatar-wrapper">
              <img src={user.photoURL || DefaultProfilePic} alt="Profile" className="profile-avatar" />
            </div>
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

                <button className="dropdown-item" onClick={() => handleLinkClick('/mycart')}>
                  <ShoppingCart size={16} /> My Cart
                </button>

                <button className="dropdown-item" onClick={() => handleLinkClick('/mylistings')}>
                  <Package size={16} /> My Listings
                </button>
                <button className="dropdown-item" onClick={() => handleLinkClick('/mypurchases')}>
                  <ShoppingBag size={16} /> My Purchases
                </button>
                <button className="dropdown-item" onClick={() => handleLinkClick('/conversations')}>
                  <MessageCircle size={16} /> Messages
                </button>
                <button className="dropdown-item" onClick={() => handleLinkClick('/mydonations')}>
                  <Gift size={16} /> My Donations
                </button>
                <button className="dropdown-item" onClick={() => handleLinkClick('/myclaimeditems')}>
                  <Heart size={16} /> My Claimed Items
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
