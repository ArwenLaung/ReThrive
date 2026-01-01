import "./Footer.css";
import Mail from "../assets/mail-icon.svg?react";
import LinkedIn from "../assets/linkedin-icon.svg?react";
import Instagram from "../assets/instagram-icon.svg?react";
import Facebook from "../assets/facebook-icon.svg?react";
import YouTube from "../assets/youtube-icon.svg?react";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <p className="declaration">
        Universiti Sains Malaysia, 11800 Penang, Malaysia © 2025. All Rights Reserved.
      </p>

      <div className="social-media-icons">
        <div className="tooltip">
          <a href="mailto:info@usminternational.my">
            <Mail className="icon" />
          </a>
          <span className="tooltip-text">
            Email
          </span>
        </div>

        <div className="tooltip">
          <a href="https://www.linkedin.com/school/universiti-sains-malaysia-official/posts/?feedView=all">
            <LinkedIn className="icon" />
          </a>
          <span className="tooltip-text">
            LinkedIn
          </span>
        </div>

        <div className="tooltip">
          <a href="https://www.instagram.com/usmofficial1969/">
            <Instagram className="icon" />
          </a>
          <span className="tooltip-text">
            Instagram
          </span>
        </div>

        <div className="tooltip">
          <a href="https://www.facebook.com/USMOfficial1969/">
            <Facebook className="icon" />
          </a>
          <span className="tooltip-text">
            Facebook
          </span>
        </div>

        <div className="tooltip">
          <a href="https://www.youtube.com/@usmcast">
            <YouTube className="icon" />
          </a>
          <span className="tooltip-text">
            YouTube
          </span>
        </div>
      </div>
    </footer >
  );
}

export default Footer;