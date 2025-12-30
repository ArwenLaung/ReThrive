import "./MyVouchersSection.css";
import Voucher from "./Voucher";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const MyVouchers = () => {
  const [userId, setUserId] = useState(null);
  const [claimedVoucherIds, setClaimedVoucherIds] = useState([]);
  const [claimedVouchers, setClaimedVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, "users", userId);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setClaimedVoucherIds(snapshot.data().claimedVouchers || []);
      }
    });
  }, [userId]);

  useEffect(() => {
    const fetchClaimedVouchers = async () => {
      if (claimedVoucherIds.length === 0) {
        setClaimedVouchers([]);
        setLoading(false);
        return;
      }

      const vouchers = await Promise.all(
        claimedVoucherIds.map(async (id) => {
          const snap = await getDoc(doc(db, "vouchers", id));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        })
      );

      setClaimedVouchers(vouchers.filter(Boolean));
      setLoading(false);
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
          <Voucher
            key={voucher.id}
            voucher={voucher}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
};

export default MyVouchers;
