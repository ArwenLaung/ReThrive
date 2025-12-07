import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, } from "lucide-react";
import MyEcoPoints from "../assets/ecopoints-icon.svg?react";
import CheckInIcon from "../assets/check-in-icon.svg?react";
import StepOne from "../assets/step-one-icon.svg?react";
import StepTwo from "../assets/step-two-icon.svg?react";
import StepThree from "../assets/step-three-icon.svg?react";
import StepFour from "../assets/step-four-icon.svg?react";
import "./MyRewards.css";
import { VOUCHERS_DATA } from "../../../constants";

const MyRewards = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [ecoPoints, setEcoPoints] = useState(0);
  const [checkedDays, setCheckedDays] = useState([]);
  const [lastCheckInDate, setLastCheckInDate] = useState(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const days = [1, 2, 3, 4, 5, 6, 7];

  const getToday = () => new Date().toISOString().split("T")[0];

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split("T")[0];
  };

  // Load & reset weekly data
  useEffect(() => {
    const storedPoints = localStorage.getItem("ecoPoints") || 0;
    setEcoPoints(Number(storedPoints));

    const stored = localStorage.getItem("weeklyCheckIn");
    const weekStart = getWeekStart();

    if (stored) {
      const parsed = JSON.parse(stored);

      if (parsed.weekStart === weekStart) {
        setCheckedDays(parsed.checkedDays || []);
        setLastCheckInDate(parsed.lastCheckInDate || null);
      } else {
        // New week reset
        setCheckedDays([]);
        setLastCheckInDate(null);
        localStorage.setItem(
          "weeklyCheckIn",
          JSON.stringify({ weekStart, checkedDays: [], lastCheckInDate: null })
        );
      }
    } else {
      localStorage.setItem(
        "weeklyCheckIn",
        JSON.stringify({ weekStart, checkedDays: [], lastCheckInDate: null })
      );
    }
  }, []);

  const handleCheckIn = (day) => {
    const today = getToday();
    const nextDay = checkedDays.length + 1;

    if (day !== nextDay) return;
    if (lastCheckInDate === today) return;

    const updatedDays = [...checkedDays, day];
    setCheckedDays(updatedDays);
    setLastCheckInDate(today);

    // Award EcoPoint permanently, no weekly reset
    const newPoints = ecoPoints + 1;
    setEcoPoints(newPoints);

    const weekStart = getWeekStart();
    localStorage.setItem(
      "weeklyCheckIn",
      JSON.stringify({ weekStart, checkedDays: updatedDays, lastCheckInDate: today })
    );
    localStorage.setItem("ecoPoints", newPoints);
  };

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

  // useEffect(() => {
  //   // 1️⃣ Load EcoPoints from backend
  //   fetch("/api/user/points")
  //     .then(res => res.json())
  //     .then(data => setEcoPoints(data.points))
  //     .catch(err => console.error(err));

  //   // 2️⃣ Load weekly check-in data from localStorage
  //   const stored = localStorage.getItem("weeklyCheckIn");
  //   const today = getToday();
  //   const weekStart = getWeekStart();

  //   if (stored) {
  //     const parsed = JSON.parse(stored);

  //     // Reset if week changed
  //     if (parsed.weekStart === weekStart) {
  //       setCheckedDays(parsed.checkedDays);
  //     } else {
  //       setCheckedDays([]); // new week
  //       localStorage.setItem(
  //         "weeklyCheckIn",
  //         JSON.stringify({ weekStart, checkedDays: [] })
  //       );
  //     }
  //   } else {
  //     // No data yet
  //     localStorage.setItem(
  //       "weeklyCheckIn",
  //       JSON.stringify({ weekStart, checkedDays: [] })
  //     );
  //   }
  // }, []);

  return (
    <div className="myrewards-page-body">
      <div className="back-link-container">
        <Link to="/MyAccount" className="back-link">
          <ArrowLeft size={18} />
          Back to My Account
        </Link>
      </div>

      <div className="ecopoints-icon-section">
        <MyEcoPoints className="ecopoints-icon" />
        <div className="points-overlay">
          <p className="number">{ecoPoints}</p>
          <p className="words">EcoPoints</p>
        </div>
      </div>

      <div className="daily-check-in-section">
        <p className="daily-check-in-title">Daily Check-in</p>
        <div className="daily-check-in-box">
          {days.map((day) => {
            // Determine button state
            let className = "daily-check-in locked";
            const nextDay = checkedDays.length + 1;
            if (checkedDays.includes(day)) className = "daily-check-in checked";
            else if (day === nextDay && lastCheckInDate !== getToday())
              className = "daily-check-in available";

            return (
              <div key={day} className={className} onClick={() => handleCheckIn(day)}>
                <CheckInIcon className="check-in-icon" />
                <p className="day">Day {day}</p>
              </div>
            );
          })}
        </div>
      </div>

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

                <button className="claim-now-button">Claim Now</button>
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