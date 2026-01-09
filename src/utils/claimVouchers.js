import { doc, runTransaction, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export const claimVouchers = async (userId, voucher) => {
  const userRef = doc(db, "users", userId);
  const voucherRef = doc(db, "vouchers", voucher.id);

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const voucherSnap = await transaction.get(voucherRef);

    if (!userSnap.exists()) throw new Error("User not found");
    if (!voucherSnap.exists()) throw new Error("Voucher not found");

    const userData = userSnap.data();
    const voucherData = voucherSnap.data();

    const currentPoints = userData.ecoPoints || 0;
    const claimedVouchers = userData.claimedVouchers || [];

    // Already claimed
    if (claimedVouchers.includes(voucher.id)) {
      throw new Error("Voucher already claimed");
    }

    // Not enough points
    if (currentPoints < voucherData.ecoPoints) {
      throw new Error("Not enough EcoPoints");
    }

    // No remaining quantity
    if ((voucherData.remainingQuantity || 0) <= 0) {
      throw new Error("Voucher is out of stock");
    }

    // Deduct points & save claimed voucher safely with arrayUnion
    transaction.update(userRef, {
      ecoPoints: currentPoints - voucherData.ecoPoints,
      claimedVouchers: arrayUnion(voucher.id),
    });

    // Deduct remainingQuantity in voucher
    transaction.update(voucherRef, {
      remainingQuantity: voucherData.remainingQuantity - 1,
    });
  });
};

export default claimVouchers;
