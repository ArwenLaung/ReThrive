import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Loader2, MapPin, MessageCircle, CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MyClaimedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [confirmModalItem, setConfirmModalItem] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { navigate('/login'); return; }
      const q = query(collection(db, "donations"), where("receiverId", "==", currentUser.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const claimed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(claimed);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleMarkReceived = async (itemId) => {
    setUpdatingStatus(itemId);
    try {
      // Get current donation data to check if donor has marked as delivered
      const donationRef = doc(db, 'donations', itemId);
      const donationSnap = await getDoc(donationRef);
      if (!donationSnap.exists()) return;
      const data = donationSnap.data();
      
      const updates = {
        receiverDeliveryStatus: 'received',
        receiverDeliveryUpdatedAt: serverTimestamp(),
        notificationForReceiver: false, // Clear receiver notification
      };
      
      let transactionComplete = false;

      // 2. CHECK: Has the donor already delivered?
      if (data.donorDeliveryStatus === 'delivered') {
        // YES -> We are the last one. Finish the transaction.
        updates.status = 'completed'; // MARK AS COMPLETED
        updates.completedAt = serverTimestamp();
        updates.notificationForDonor = false; // No need to notify, they are done
        transactionComplete = true;

        // 3. AWARD POINTS TO DONOR (Logic: Receiver updates Donor's points)
        if (data.donorId) {
          const donorUserRef = doc(db, 'users', data.donorId);
          await updateDoc(donorUserRef, {
             ecoPoints: increment(10) // Give 10 points
          });
        }
      } else {
        // NO -> We are first. Notify the donor.
        updates.notificationForDonor = true;
      }
      
      // 4. Update the Donation
      await updateDoc(donationRef, updates);

      // 5. Show the specific Alert you requested
      if (transactionComplete) {
        alert("Transaction complete! The item is fully claimed and points have been awarded to the donor.");
      } else {
        alert("Item marked as received! Waiting for donor to confirm delivery.");
      }

    } catch (e) {
      console.error('Error marking donation as received:', e);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleConfirmModalConfirm = async () => {
    if (!confirmModalItem) return;
    await handleMarkReceived(confirmModalItem.id);
    setConfirmModalItem(null);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#7db038]" size={40} />
      </div>
    );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#7db038]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-extrabold text-[#364f15]">My Claimed Items</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-[#7db038]/20">
            <div className="bg-[#7db038]/10 p-6 rounded-full mb-4"><Gift size={48} className="text-[#7db038]" /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No claimed items</h2>
            <Link to="/donationcorner" className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#4a6b1d] transition-colors">Browse Donations</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="relative w-full md:w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2">
                        {/* Status Badge */}
                        {(() => {
                          const isCompleted = item.status === 'completed' || (item.receiverDeliveryStatus === 'received' && item.donorDeliveryStatus === 'delivered');
                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${isCompleted ? 'bg-green-600' : 'bg-yellow-500'}`}>
                              {isCompleted ? 'CLAIMED' : 'PENDING'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-xs text-gray-500">Claimed on {item.claimedAt?.toDate ? new Date(item.claimedAt.toDate()).toLocaleDateString() : "Recent"}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin size={12} />
                          <span>{item.meetupLocation || item.location || (item.locations && item.locations[0])}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button onClick={() => navigate(`/chat-donation/${item.id}`)} className="flex items-center gap-2 px-4 py-2 bg-[#7db038] text-white rounded-xl font-semibold hover:bg-[#4a6b1d] transition-all active:scale-95">
                          <MessageCircle size={18} /> Contact Donor
                        </button>

                        {item.receiverDeliveryStatus === 'received' ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold">
                            <CheckCircle size={18} /> Received
                          </div>
                        ) : (
                          <button onClick={() => setConfirmModalItem(item)} disabled={updatingStatus === item.id} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">
                            {updatingStatus === item.id ? <><Loader2 className="animate-spin" size={18} /> Updating...</> : <><CheckCircle size={18} /> Received</>}
                          </button>
                        )}

                        <Link to={`/donation/${item.id}`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-95">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmModalItem}
        title="Mark as received?"
        message="Confirm that you have received this donated item?"
        confirmText="Confirm"
        cancelText="Cancel"
        onClose={() => setConfirmModalItem(null)}
        onConfirm={handleConfirmModalConfirm}
      />
    </div>
  );
};

export default MyClaimedItems;