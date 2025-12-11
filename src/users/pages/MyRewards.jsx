import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import MyEcoPoints from "../assets/ecopoints-icon.svg?react";
import CheckInIcon from "../assets/check-in-icon.svg?react";
import StepOne from "../assets/step-one-icon.svg?react";
import StepTwo from "../assets/step-two-icon.svg?react";
import StepThree from "../assets/step-three-icon.svg?react";
import StepFour from "../assets/step-four-icon.svg?react";
import "./MyRewards.css";
import { VOUCHERS_DATA } from "../../../constants";

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const MyRewards = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  // User State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rewards State
  const [ecoPoints, setEcoPoints] = useState(0);
  const [checkedDays, setCheckedDays] = useState([]);
  const [lastCheckInDate, setLastCheckInDate] = useState(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  // --- 1. LOAD DATA FROM FIREBASE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setEcoPoints(data.ecoPoints || 0);

          // Check if week has reset
          const currentWeekStart = getWeekStart();
          if (data.weekStart === currentWeekStart) {
            setCheckedDays(data.checkedDays || []);
            setLastCheckInDate(data.lastCheckInDate || null);
          } else {
            // New week: Reset check-ins but KEEP points
            await updateDoc(userRef, {
              weekStart: currentWeekStart,
              checkedDays: [],
              lastCheckInDate: null
            });
            setCheckedDays([]);
            setLastCheckInDate(null);
          }
        } else {
          // Create document if it doesn't exist
          await setDoc(userRef, {
            email: currentUser.email,
            ecoPoints: 0,
            checkedDays: [],
            weekStart: getWeekStart(),
            lastCheckInDate: null
          }, { merge: true });
        }
      } catch (error) {
        console.error("Error fetching rewards data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // --- 2. HANDLE CHECK-IN ---
  const handleCheckIn = async (day) => {
    if (!user) return;

    const today = getToday();
    const nextDay = checkedDays.length + 1;

    // Validation: Must click next sequential day & haven't checked in today
    if (day !== nextDay) return;
    if (lastCheckInDate === today) {
      alert("You have already checked in today! Come back tomorrow.");
      return;
    }

    // Optimistic UI Update (Update screen instantly)
    const newPoints = ecoPoints + 1;
    const newCheckedDays = [...checkedDays, day];
    
    setEcoPoints(newPoints);
    setCheckedDays(newCheckedDays);
    setLastCheckInDate(today);

    try {
      // Save to Firebase
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ecoPoints: newPoints,
        checkedDays: newCheckedDays,
        lastCheckInDate: today,
        weekStart: getWeekStart() // Ensure week is tracked
      });
    } catch (error) {
      console.error("Error saving check-in:", error);
      // Revert on error
      setEcoPoints(ecoPoints);
      setCheckedDays(checkedDays);
      setLastCheckInDate(lastCheckInDate);
      alert("Check-in failed. Please check your connection.");
    }
  };

  // Scroll Logic for Vouchers
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
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
      <div className="back-link-container">
        <Link to="/myaccount" className="back-link">
          <ArrowLeft size={18} />
          Back to My Account
        </Link>
      </div>

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
              className = "daily-check-in checked"; // Already checked
            } else if (day === nextDay && lastCheckInDate !== getToday()) {
              className = "daily-check-in available"; // Ready to claim
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

      {/* Vouchers Section */}
      <div className="claim-vouchers-section">
        <p className="claim-vouchers-title">Claim Your Vouchers</p>

        <div className="available-vouchers-container">
          <button
            onClick={() => scroll("left")}
            className="scroll-left-button-container"
            disabled={!canScrollLeft}
          >
            <ChevronLeft size={48} strokeWidth={2.5} className="scroll-left-button" />
          </button>

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="available-vouchers-section"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {VOUCHERS_DATA.map((voucher) => (
              <div key={voucher.id} className="voucher">
                <div className="voucher-image-container">
                  <img src={voucher.image} alt={voucher.title} className="voucher-image" />
                </div>

                <div className="voucher-description">
                  <h2 className="redemption-points">{voucher.points} EcoPoints</h2>
                  <h3 className="voucher-sponsor">{voucher.sponsor}</h3>
                  <h3 className="voucher-sponsor">RM{voucher.value} rebate</h3>
                </div>

                <button 
                  className={`claim-now-button ${ecoPoints < voucher.points ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={ecoPoints < voucher.points}
                >
                  {ecoPoints < voucher.points ? "Not Enough Points" : "Claim Now"}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="scroll-right-button-container"
            disabled={!canScrollRight}
          >
            <ChevronRight size={48} strokeWidth={2.5} className="scroll-right-button" />
          </button>
        </div>
      </div>

      <div className="how-this-works-section">
        <p className="how-this-works-title">
          How This Works
        </p>
        <div className="how-this-works-container">
          <div className="step-container">
            <StepOne className="step-icon" />
            <p className="step-description">
              Log in at least once a day to claim 1 EcoPoint daily
            </p>
          </div>
          <div className="step-container">
            <StepTwo className="step-icon" />
            <p className="step-description">
              Buy on ReThrive and earn 10 EcoPoints on each purchase
            </p>
          </div>
          <div className="step-container">
            <StepThree className="step-icon" />
            <p className="step-description">
              Register and join events to earn 5 EcoPoints per event
            </p>
          </div>
          <div className="step-container">
            <StepFour className="step-icon" />
            <p className="step-description">
              Use EcoPoints to redeem exclusive and limited vouchers
            </p>
          </div>
        </div>
      </div>
    </div>
  )
};

export default MyRewards;