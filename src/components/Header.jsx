import "./Header.css";
import logo from "../assets/logo.svg";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <img src={logo} alt=" ReThrive Logo" />
      </div>

      <nav className="nav-bar">
        <NavLink to="/" className="nav-link">
          About
        </NavLink>

        <NavLink to="/" className="nav-link">
          Events
        </NavLink>

        <NavLink to="/" className="nav-link">
          Marketplace
        </NavLink>

        <NavLink to="/" className="nav-link">
          Donation
        </NavLink>
      </nav>

      <div className="login">
        <button className="login-button">Log In</button>
      </div>
    </header >
  );
}

export default Header;