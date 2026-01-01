import "./MyVouchersSection.css";
import { MapPin, Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const MyVouchers = () => {
  const [userId, setUserId] = useState(null);
  const [claimedVoucherIds, setClaimedVoucherIds] = useState([]);
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen for auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setClaimedVouchers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to user's claimed vouchers
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setClaimedVoucherIds(snapshot.data().claimedVouchers || []);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Fetch voucher details
  useEffect(() => {
    const fetchClaimedVouchers = async () => {
      if (claimedVoucherIds.length === 0) {
        setClaimedVouchers([]);
        setLoading(false);
        return;
      }

      try {
        const vouchers = await Promise.all(
          claimedVoucherIds.map(async (voucherId) => {
            const voucherRef = doc(db, "vouchers", voucherId);
            const voucherSnap = await getDoc(voucherRef);

            if (voucherSnap.exists()) {
              return { id: voucherSnap.id, ...voucherSnap.data() };
            }
            return null;
          })
        );

        setClaimedVouchers(vouchers.filter(Boolean));
      } catch (error) {
        console.error("Error fetching claimed vouchers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClaimedVouchers();
  }, [claimedVoucherIds]);

  return (
    <div className="my-vouchers-section">
      <p className="my-vouchers-title">My Vouchers</p>

      <div className="my-vouchers-container">
        {loading && <p>Loading vouchers...</p>}

        {!loading && claimedVouchers.length === 0 && (
          <p>You have not claimed any vouchers yet.</p>
        )}

        {claimedVouchers.map((voucher) => (
          <div key={voucher.id} className="my-voucher">
            <div className="my-voucher-image-container">
              <img
                src={voucher.image}
                alt={voucher.sponsor}
                className="my-voucher-image"
              />
            </div>

            <div className="my-voucher-description">
              <h3 className="my-voucher-sponsor">
                <MapPin color="grey" />
                {voucher.sponsor}
              </h3>
              <h3 className="my-voucher-value">
                <Banknote color="grey" />
                RM{voucher.value} rebate
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyVouchers;