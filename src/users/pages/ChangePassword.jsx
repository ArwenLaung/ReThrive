import "./ChangePassword.css";

import { useState } from "react";
import { auth } from "../../firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert("Password updated successfully.");
      navigate("/myaccount");

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetEmail = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email, {
        url: "https://re-thrive.vercel.app/login" // redirect after reset
      });
      alert("Password reset email sent.");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="change-password-page-body">
      <div className="change-password-container">
        <h1 className="change-password-page-title">Change Password</h1>

        {/* Current Password */}
        <div className="password-field">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current Password"
            className="password-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="password-toggle"
            aria-label="Toggle current password visibility"
          >
            {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* New Password */}
        <div className="password-field">
          <input
            type={showNew ? "text" : "password"}
            placeholder="New Password"
            className="password-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="password-toggle"
            aria-label="Toggle new password visibility"
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Confirm New Password */}
        <div className="password-field">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm New Password"
            className="password-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="password-toggle"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="update-password-btn"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        <div className="reset-password-container">
          <button
            onClick={handleResetEmail}
            className="reset-password-link"
          >
            Forgot current password? Send reset email
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
