import "./Login.css";
import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ReThriveLogo from "../assets/logo.svg";
import BadmintonHall from "../assets/badminton-hall.mp4";
import ConvoSite from "../assets/convo-site.mp4";
import DTSP from "../assets/dtsp.mp4";
import Museum from "../assets/museum.mp4";

const PasswordInput = ({ value, onChange, disabled, showPassword }) => {
  const [displayValue, setDisplayValue] = useState("");
  const lastCharTimeoutRef = useRef(null);

  useEffect(() => {
    // Whenever value changes, update displayValue if showPassword is true
    if (showPassword) {
      setDisplayValue(value); // show full password
      if (lastCharTimeoutRef.current) clearTimeout(lastCharTimeoutRef.current);
    }
  }, [showPassword, value]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);

    if (showPassword) {
      setDisplayValue(val); // show full password if eye is open
      return;
    }

    if (lastCharTimeoutRef.current) clearTimeout(lastCharTimeoutRef.current);

    if (val.length === 0) {
      setDisplayValue("");
      return;
    }

    // Mask all except last character
    setDisplayValue("•".repeat(val.length - 1) + val[val.length - 1]);

    // After 800ms (slower so you can see it), mask everything
    lastCharTimeoutRef.current = setTimeout(() => {
      setDisplayValue("•".repeat(val.length));
    }, 800);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      className="login-input"
      placeholder="••••••••"
    />
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const showMessage = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Mock login logic
    if (!email.endsWith('@student.usm.my')) {
      showMessage('Invalid login. Please check your USM email address and password.');
      setIsLoading(false);
      return;
    }

    console.log('Attempting login with:', email, password);
    setTimeout(() => {
      setIsLoading(false);
      showMessage('Login Successful!');
    }, 1500);
  }

  const handleChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    if (inputRef.current) {
      // Temporarily show last character
      inputRef.current.type = "text";

      // Mask again after 500ms
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.type = "password";
        }
      }, 500);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="login-body">
      <div className="background-layer">
        <div className="video-wrapper">
          <video src={BadmintonHall} autoPlay loop muted></video>
        </div>
        <div className="video-wrapper">
          <video src={ConvoSite} autoPlay loop muted></video>
        </div>
        <div className="video-wrapper">
          <video src={DTSP} autoPlay loop muted></video>
        </div>
        <div className="video-wrapper">
          <video src={Museum} autoPlay loop muted></video>
        </div>
      </div>

      <div className="login-form-column">
        <div className="login-form-container">
          <div className="login-form-header">
            <img src={ReThriveLogo} className="login-logo" alt={"ReThrive Logo"} />
            <h1 className="title">
              Sign In
            </h1>
            <p className="description">
              Access your campus marketplace with USM ID
            </p>
          </div>

          {error && <p style={{ color: 'red', textAlign: 'center', padding: '0 40px' }}>{error}</p>}

          <form className="form-container" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email" className="input-label">
                USM Email Address
              </label>
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
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="input-container">
                <Lock className="input-icon" />
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

            <div className="forgot-password">
              <a href="https://self.usm.my/selfpasswordmanagement/">
                Forgot Password?
              </a>
            </div>

            <div className="button-container">
              <button
                type="submit"
                className="login-page-button"
                disabled={isLoading}
              >
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