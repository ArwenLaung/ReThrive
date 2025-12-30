import "./Voucher.css";
import { MapPin, Banknote, X } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";

const Voucher = ({ voucher, userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [using, setUsing] = useState(false);

  const confirmUseVoucher = async () => {
    if (!userId) return;

    try {
      setUsing(true);
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        claimedVouchers: arrayRemove(voucher.id),
      });

      alert("Voucher successfully used!");
      setShowConfirm(false);
      setShowModal(false);
    } catch (error) {
      console.error("Error using voucher:", error);
      alert("Failed to use voucher. Please try again.");
    } finally {
      setUsing(false);
    }
  };

  return (
    <>
      {/* Voucher Card */}
      <div className="my-voucher" onClick={() => setShowModal(true)}>
        <div className="my-voucher-image-container">
          <img
            src={voucher.image}
            alt={voucher.sponsor}
            className="my-voucher-image"
          />
        </div>

        <div className="my-voucher-description">
          <h3 className="my-voucher-sponsor">
            <MapPin size={16} /> {voucher.sponsor}
          </h3>
          <h3 className="my-voucher-value">
            <Banknote size={16} /> RM{voucher.value} rebate
          </h3>
        </div>
      </div>

      {/* Voucher Modal */}
      {showModal && (
        <div className="voucher-modal-overlay">
          <div className="voucher-modal">
            <button
              className="voucher-modal-close"
              onClick={() => setShowModal(false)}
            >
              <X />
            </button>

            <img
              src={voucher.image}
              alt={voucher.sponsor}
              className="voucher-modal-image"
            />

            <h2 className="voucher-modal-sponsor">
              {voucher.sponsor}
            </h2>

            <div className="voucher-detail">
              <strong>Value</strong>
              <p>RM {voucher.value}</p>
            </div>

            <div className="voucher-detail">
              <strong>Expiry Date</strong>
              <p>{voucher.expiryDate}</p>
            </div>

            <div className="voucher-detail">
              <strong>Terms & Conditions</strong>
              <ol>
                {voucher.tnc.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            </div>

            <button
              className="voucher-use-btn"
              onClick={() => setShowConfirm(true)}
            >
              Use Now
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="voucher-confirm-overlay">
          <div className="voucher-confirm-dialog">
            <h3>Confirm Voucher Usage</h3>
            <p>
              Are you sure you want to use this voucher?
            </p>

            <div className="voucher-confirm-actions">
              <button
                className="voucher-cancel-btn"
                onClick={() => setShowConfirm(false)}
                disabled={using}
              >
                Cancel
              </button>

              <button
                className="voucher-confirm-btn"
                onClick={confirmUseVoucher}
                disabled={using}
              >
                {using ? "Using..." : "Yes, Use Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Voucher;