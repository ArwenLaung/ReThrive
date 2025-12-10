import "./Login.css"; 
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReThriveLogo from "../assets/logo.svg";

import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

import BadmintonHall from "../assets/badminton-hall.mp4";
import ConvoSite from "../assets/convo-site.mp4";
import DTSP from "../assets/dtsp.mp4";
import Museum from "../assets/museum.mp4";

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!email.endsWith('@student.usm.my')) {
      setError('Please use a valid USM student email (@student.usm.my).');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      // Whitelist Check (Firestore)
      // Query the 'validStudents' collection for the entered email
      const whitelistRef = collection(db, "validStudents");
      const q = query(whitelistRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Email NOT found in whitelist
        setError("This email is not authorized to register.");
        setIsLoading(false);
        return;
      }

      // Create Account (Firebase Auth)
      // Email is in whitelist. Proceed to create account.
      await createUserWithEmailAndPassword(auth, email, password);
      
      alert('Account Created Successfully!');
      navigate('/login'); // Redirect to login on success

    } catch (err) {
      console.error("Signup Error:", err);
      // Handle Firebase specific errors
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please log in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-body">
      {/* Background Videos */}
      <div className="background-layer">
        <div className="video-wrapper"><video src={BadmintonHall} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={ConvoSite} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={DTSP} autoPlay loop muted></video></div>
        <div className="video-wrapper"><video src={Museum} autoPlay loop muted></video></div>
      </div>

      <div className="login-form-column">
        <div className="login-form-container" style={{ height: 'auto', padding: '30px' }}>
          <div className="login-form-header">
            <img src={ReThriveLogo} className="login-logo" alt="ReThrive Logo" style={{ width: '50%' }} />
            <h1 className="title">Sign Up</h1>
            <p className="description">Join the USM marketplace community</p>
          </div>

          {error && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{error}</p>}

          <form className="form-container" onSubmit={handleSignup}>
            
            {/* Email */}
            <div className="input-group">
              <label className="input-label">USM Email Address</label>
              <div className="input-container">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                  placeholder="username@student.usm.my"
                />
              </div>
            </div>

            {/* Create Password */}
            <div className="input-group">
              <label className="input-label">Create Password</label>
              <div className="input-container">
                <Lock className="input-icon" />
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

            {/* Confirm Password */}
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-container">
                <Lock className="input-icon" />
                <div className="password-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="login-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} className="input-icon" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="form-footer" style={{ justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6e6e6e' }}>Already have an account? </span>
              <Link to="/login" className="create-account-link" style={{ marginLeft: '5px' }}>
                Log In
              </Link>
            </div>

            <div className="button-container">
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;