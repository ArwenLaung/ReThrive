import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "../../firebase";
import { claimVouchers } from "../../utils/claimVouchers";
import "./VouchersSection.css";

const VouchersSection = ({ ecoPoints, claimedVouchers, userId }) => {
  const scrollRef = useRef(null);
  const [vouchers, setVouchers] = useState([]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const q = query(collection(db, "vouchers"), orderBy("sponsor", "asc"));
        const snapshot = await getDocs(q);
        setVouchers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      }
    };

    fetchVouchers();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 300);
  };

  return (
    <div className="claim-vouchers-section">
      <p className="claim-vouchers-title">Claim Your Vouchers</p>

      <div className="available-vouchers-container">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className="scroll-left-button-container"
        >
          <ChevronLeft size={48} strokeWidth={2.5} />
        </button>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="available-vouchers-section"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {vouchers.map((voucher) => {
            const alreadyClaimed = claimedVouchers.includes(voucher.id);
            const notEnoughPoints = ecoPoints < voucher.ecoPoints;
            const disabled = alreadyClaimed || notEnoughPoints;

            return (
              <div key={voucher.id} className="voucher">
                <div className="voucher-image-container">
                  <img
                    src={voucher.image}
                    alt={voucher.sponsor}
                    className="voucher-image"
                  />
                </div>

                <div className="voucher-description">
                  <h2 className="redemption-points">
                    {voucher.ecoPoints} EcoPoints
                  </h2>
                  <h3 className="voucher-sponsor">{voucher.sponsor}</h3>
                  <h3 className="voucher-value">
                    RM{voucher.value} rebate
                  </h3>
                </div>

                <button
                  disabled={disabled}
                  className={`claim-now-button ${disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={async () => {
                    try {
                      await claimVouchers(userId, voucher);
                      alert("Voucher claimed successfully!");
                    } catch (error) {
                      alert(error.message);
                    }
                  }}
                >
                  {alreadyClaimed
                    ? "Claimed"
                    : notEnoughPoints
                      ? "Not Enough Points"
                      : "Claim Now"}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className="scroll-right-button-container"
        >
          <ChevronRight size={48} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default VouchersSection;