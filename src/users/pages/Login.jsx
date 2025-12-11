import "./Login.css";
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReThriveLogo from "../assets/logo.svg";

// --- FIREBASE IMPORTS ---
import { auth } from '../../firebase'; // Ensure path is correct
import { signInWithEmailAndPassword } from "firebase/auth";

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

    // Basic email format check
    if (!email.endsWith('@student.usm.my')) {
      setError('Please use your USM student email.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Firebase Login
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Success Redirect
      // alert('Login Successful!'); // Optional
      navigate('/'); // Redirect to Home/Dashboard

    } catch (err) {
      console.error("Login Error:", err);
      // Handle Login Errors
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('User not found. Please create an account.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }

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

            {/* --- FOOTER SECTION --- */}
            <div className="form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
              <span style={{ fontSize: '13px', color: '#6e6e6e' }}>New to us? </span>
              <Link to="/signup" className="create-account-link" style={{ marginLeft: '4px' }}>
                Create Account
              </Link>
              </div>
              <a href="https://self.usm.my/selfpasswordmanagement/" className="forgot-password-link">
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