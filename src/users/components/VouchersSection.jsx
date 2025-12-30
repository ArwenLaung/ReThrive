import { useEffect, useRef, useState } from "react";
import { MapPin, Banknote, X } from "lucide-react";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "../../firebase";
import { claimVouchers } from "../../utils/claimVouchers";
import "./VouchersSection.css";

const VouchersSection = ({ ecoPoints, claimedVouchers, userId }) => {
  const scrollRef = useRef(null);
  const [vouchers, setVouchers] = useState([]);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Local state to update UI immediately after claiming
  const [localEcoPoints, setLocalEcoPoints] = useState(ecoPoints);
  const [localClaimedVouchers, setLocalClaimedVouchers] = useState(claimedVouchers);

  // Fetch latest user data on mount to persist claimed vouchers across refresh
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setLocalClaimedVouchers(data.claimedVouchers || []);
          setLocalEcoPoints(data.ecoPoints || 0);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  // Fetch vouchers in real-time
  useEffect(() => {
    const q = query(collection(db, "vouchers"), orderBy("sponsor", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setVouchers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      },
      (error) => {
        console.error("Error fetching vouchers:", error);
      }
    );

    return () => unsubscribe(); // cleanup listener
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
            const alreadyClaimed = localClaimedVouchers.includes(voucher.id);
            const notEnoughPoints = localEcoPoints < voucher.ecoPoints;
            const outOfStock = voucher.remainingQuantity <= 0;
            const disabled = alreadyClaimed || notEnoughPoints || outOfStock;

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
                  <div className="voucher-location">
                    <div className="icon-container">
                      <MapPin size={16} />
                    </div>
                    <h3 className="voucher-sponsor">{voucher.sponsor}</h3>
                  </div>
                  <div className="voucher-value-container">
                    <Banknote size={16} />
                    <h3 className="voucher-value">
                      RM{voucher.value} rebate
                    </h3>
                  </div>
                </div>

                <button
                  disabled={disabled}
                  className={`claim-now-button ${disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={async () => {
                    try {
                      await claimVouchers(userId, voucher);
                      alert("Voucher claimed successfully!");
                      // Update local state to reflect immediately
                      setLocalClaimedVouchers([...localClaimedVouchers, voucher.id]);
                      setLocalEcoPoints(localEcoPoints - voucher.ecoPoints);
                    } catch (error) {
                      alert(error.message);
                    }
                  }}
                >
                  {alreadyClaimed
                    ? "Claimed"
                    : outOfStock
                      ? "Fully Redeemed"
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