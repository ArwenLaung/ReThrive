import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { addEcoPoints as addPoints } from "../../utils/ecoPoints";
import MyEcoPoints from "../assets/ecopoints-icon.svg?react";
import CheckInIcon from "../assets/check-in-icon.svg?react";
import StepOne from "../assets/step-one-icon.svg?react";
import StepTwo from "../assets/step-two-icon.svg?react";
import StepThree from "../assets/step-three-icon.svg?react";
import StepFour from "../assets/step-four-icon.svg?react";
import VouchersSection from "../components/VouchersSection.jsx";
import MyVouchers from "../components/MyVouchersSection.jsx";
import "./MyRewards.css";

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const MyRewards = () => {
  const navigate = useNavigate();

  // User State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rewards State
  const [ecoPoints, setEcoPoints] = useState(0);
  const [checkedDays, setCheckedDays] = useState([]);
  const [lastCheckInDate, setLastCheckInDate] = useState(null);

  // Track claimed vouchers
  const [claimedVouchers, setClaimedVouchers] = useState([]);

  const days = [1, 2, 3, 4, 5, 6, 7];

  // Helper: Get today's date string (YYYY-MM-DD)
  const getToday = () => new Date().toISOString().split("T")[0];

  // Helper: Get start of current week (Monday)
  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split("T")[0];
  };

  // --- 1. LOAD USER DATA AND REAL-TIME ECOPOINTS ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);

      // Real-time listener for EcoPoints
      const unsubscribeSnap = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEcoPoints(data.ecoPoints || 0);
          setClaimedVouchers(data.claimedVouchers || []);


          const currentWeekStart = getWeekStart();
          if (data.weekStart === currentWeekStart) {
            setCheckedDays(data.checkedDays || []);
            setLastCheckInDate(data.lastCheckInDate || null);
          } else {
            // New week: reset check-ins but keep points
            await updateDoc(userRef, {
              weekStart: currentWeekStart,
              checkedDays: [],
              lastCheckInDate: null
            });
            setCheckedDays([]);
            setLastCheckInDate(null);
          }
        } else {
          // Create user document if doesn't exist
          await setDoc(userRef, {
            email: currentUser.email,
            ecoPoints: 0,
            checkedDays: [],
            weekStart: getWeekStart(),
            lastCheckInDate: null
          }, { merge: true });
          setEcoPoints(0);
          setCheckedDays([]);
          setLastCheckInDate(null);
        }

        setLoading(false);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // --- 2. HANDLE DAILY CHECK-IN ---
  const handleCheckIn = async (day) => {
    if (!user) return;

    const today = getToday();
    const nextDay = checkedDays.length + 1;

    if (day !== nextDay) return;
    if (lastCheckInDate === today) {
      alert("You have already checked in today! Come back tomorrow.");
      return;
    }

    try {
      // Add 1 EcoPoint
      const newPoints = await addPoints(user.uid, 1);

      // Update checkedDays and lastCheckInDate in Firestore
      const userRef = doc(db, "users", user.uid);
      const newCheckedDays = [...checkedDays, day];
      await updateDoc(userRef, {
        checkedDays: newCheckedDays,
        lastCheckInDate: today
      });

      // Update local state
      setEcoPoints(newPoints);
      setCheckedDays(newCheckedDays);
      setLastCheckInDate(today);
    } catch (error) {
      console.error("Error on check-in:", error);
      alert("Check-in failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="myrewards-page-body">
      {/* Back button container removed */}

      {/* Points Display */}
      <div className="ecopoints-icon-section">
        <MyEcoPoints className="ecopoints-icon" />
        <div className="points-overlay">
          <p className="number">{ecoPoints}</p>
          <p className="words">EcoPoints</p>
        </div>
      </div>

      {/* Check-In Grid */}
      <div className="daily-check-in-section">
        <p className="daily-check-in-title">Daily Check-in</p>
        <div className="daily-check-in-box">
          {days.map((day) => {
            let className = "daily-check-in locked";
            const nextDay = checkedDays.length + 1;

            if (checkedDays.includes(day)) {
              className = "daily-check-in checked";
            } else if (day === nextDay && lastCheckInDate !== getToday()) {
              className = "daily-check-in available";
            }

            return (
              <div
                key={day}
                className={className}
                onClick={() => day === nextDay ? handleCheckIn(day) : null}
              >
                <CheckInIcon className="check-in-icon" />
                <p className="day">Day {day}</p>
              </div>
            );
          })}
        </div>
      </div>

      <VouchersSection
        ecoPoints={ecoPoints}
        claimedVouchers={claimedVouchers}
        userId={user.uid}
      />

      <MyVouchers
        claimedVouchers={claimedVouchers}
        userId={user.uid}
      />

      <div className="how-this-works-section">
        <p className="how-this-works-title">How This Works</p>
        <div className="how-this-works-container">
          <div className="step-container">
            <StepOne className="step-icon" />
            <p className="step-description">Log in at least once a day to claim 1 EcoPoint daily</p>
          </div>
          <div className="step-container">
            <StepTwo className="step-icon" />
            <p className="step-description">Buy on ReThrive and earn 10 EcoPoints on each purchase</p>
          </div>
          <div className="step-container">
            <StepThree className="step-icon" />
            <p className="step-description">Register and join events to earn 5 EcoPoints per event</p>
          </div>
          <div className="step-container">
            <StepFour className="step-icon" />
            <p className="step-description">Use EcoPoints to redeem exclusive and limited vouchers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRewards;