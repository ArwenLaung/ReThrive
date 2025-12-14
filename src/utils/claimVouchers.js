import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

export const claimVouchers = async (userId, voucher) => {
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found");
    }

    const userData = userSnap.data();
    const currentPoints = userData.ecoPoints || 0;
    const claimedVouchers = userData.claimedVouchers || [];

    // ❌ Already claimed
    if (claimedVouchers.includes(voucher.id)) {
      throw new Error("Voucher already claimed");
    }

    // ❌ Not enough points
    if (currentPoints < voucher.ecoPoints) {
      throw new Error("Not enough EcoPoints");
    }

    // ✅ Deduct points & save claimed voucher
    transaction.update(userRef, {
      ecoPoints: currentPoints - voucher.ecoPoints,
      claimedVouchers: [...claimedVouchers, voucher.id],
    });
  });
};

export default claimVouchers;