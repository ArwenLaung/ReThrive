import "./LeftColumnBar.css";
import { CircleUserRound, PanelLeftClose, PanelRightOpen, LogOut } from "lucide-react";
import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

const LeftColumnBar = ({ onCollapseChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/login");
      })
      .catch((error) => console.log(error));
  };

  // notify parent whenever collapsed changes
  useEffect(() => {
    onCollapseChange?.(collapsed);
  }, [collapsed, onCollapseChange]);

  return (
    <div className={`left-column-bar-container ${collapsed ? "collapsed" : ""}`}>
      <div className="collapse-button-container">
        <div className="admin-tooltip-container">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="collapse-button"
          >
            {collapsed ? <PanelRightOpen size={24} /> : <PanelLeftClose size={24} />}
          </button>
          <span className="admin-tooltip-text">
            {collapsed ? "Open Sidebar" : "Close Sidebar"}
          </span>
        </div>
      </div>

      <div className="identity-container">
        <CircleUserRound size={70} className="admin-icon" />
        <p className="admin-name">Admin</p>
      </div>

      <div className="admin-selections-container">
        <NavLink to="/marketplaceModeration" className={({ isActive }) => `admin-selection ${isActive ? "active" : ""}`}>
          Marketplace Moderation
        </NavLink>
        <NavLink to="/donationModeration" className={({ isActive }) => `admin-selection ${isActive ? "active" : ""}`}>
          Donation Moderation
        </NavLink>
        <NavLink to="/eventPosting" className={({ isActive }) => `admin-selection ${isActive ? "active" : ""}`}>
          Event Posting
        </NavLink>
        <NavLink to="/voucherManagement" className={({ isActive }) => `admin-selection ${isActive ? "active" : ""}`}>
          Voucher Management
        </NavLink>
        <NavLink to="/dataVisualisation" className={({ isActive }) => `admin-selection ${isActive ? "active" : ""}`}>
          Data Visualisation
        </NavLink>
      </div>

      <div className="logout-button-container">
        <button className="logout-button" onClick={() => setShowLogoutModal(true)}>
          <LogOut className="logout-button-icon" />
          <p className="logout-button-text">
            Log Out
          </p>
        </button>

        {showLogoutModal && (
          <div className="logout-modal">
            <div className="logout-modal-content">
              <p className="logout-prompt">
                Are you sure you want to log out?
              </p>
              <div className="logout-confirmation-buttons-container">
                <button onClick={handleLogout} className="logout-yes-button">
                  Yes
                </button>
                <button onClick={() => setShowLogoutModal(false)} className="logout-cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftColumnBar;
