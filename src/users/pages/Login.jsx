import "./Login.css";
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReThriveLogo from "../assets/logo.svg";
import { auth } from '../../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

import BadmintonHall from "../assets/badminton-hall.mp4";
import ConvoSite from "../assets/convo-site.mp4";
import DTSP from "../assets/dtsp.mp4";
import Museum from "../assets/museum.mp4";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const ADMIN_UID = "s1vc26Q4mTYqsg2n0WL7CSN6q3k1";

    // Basic email format check
    if (!email.endsWith('@student.usm.my')) {
      setError('Please use your USM student email.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Firebase Login and Capture User Credential
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Check Role and Redirect
      if (uid === ADMIN_UID) {
        // Admin successfully logged in: Redirect to the Admin Dashboard
        navigate("/marketplaceModeration");
      } else {
        // Normal user successfully logged in: Redirect to the Home Page
        navigate('/');
      }

    } catch (err) {
      console.error("Login Error:", err);
      // Handle Login Errors
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password.');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: "https://re-thrive.vercel.app/login" // redirect after reset
      });
      alert("If an account exists, a reset email has been sent.");
    } catch (error) {
      alert("If an account exists, a reset email has been sent.");
      console.error("Password reset error:", error);
    }
  };

  return (
    <div className="login-body">
      <div className="background-layer">
        <div className="video-wrapper"><video src={BadmintonHall} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={ConvoSite} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={DTSP} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={Museum} autoPlay loop muted></video></div>
      </div>

      <div className="login-form-column">
        <div className="login-form-container">
          <div className="login-form-header">
            <img src={ReThriveLogo} className="login-logo" alt={"ReThrive Logo"} />
            <h1 className="title">Sign In</h1>
            <p className="description">Access your campus marketplace with USM ID</p>
          </div>

          {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{error}</p>}

          <form className="form-container" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email" className="input-label">USM Email Address</label>
              <div className="input-container">
                <Mail className="input-icon" />
                <input
                  id="student-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                  placeholder="username@student.usm.my"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className="input-container">
                <Lock className="input-icon" />
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} className="input-icon" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#6e6e6e' }}>New to us? </span>
                <Link to="/signup" className="create-account-link" style={{ marginLeft: '4px' }}>
                  Create Account
                </Link>
              </div>
              <a
                href="#!"
                className="forgot-password-link"
                onClick={() => {
                  const userEmail = prompt("Enter your USM email to reset password:");
                  if (userEmail) handleResetPassword(userEmail);
                }}

              >
                Forgot Password?
              </a>
            </div>

            <div className="button-container">
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Logging In...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;