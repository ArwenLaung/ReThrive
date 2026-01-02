import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Loader2, MapPin, MessageCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';
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
        claimed.sort((a, b) => (b.claimedAt?.seconds || 0) - (a.claimedAt?.seconds || 0));
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

  const pendingClaims = items.filter(item => item.status !== 'completed');
  const historyClaims = items.filter(item => item.status === 'completed');

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

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* PENDING CLAIMS */}
        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-yellow-600" /> Pending Claims
            </h2>
            
            {pendingClaims.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-[#7db038]/20 text-center text-gray-500 italic">
                   No pending claims. <Link to="/donationcorner" className="text-[#7db038] font-bold underline">Browse Donations</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {pendingClaims.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-sm hover:shadow-md transition-all">
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Image */}
                                    <div className="relative w-full md:w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                                        <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-[10px] font-bold rounded">PENDING</span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                                            <p className="text-sm text-gray-500">Claimed: {item.claimedAt?.toDate ? new Date(item.claimedAt.toDate()).toLocaleDateString() : 'Recent'}</p>
                                        </div>

                                        {/* Pickup Details Block */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold text-gray-700">Location</p>
                                                    <p className="text-gray-600">{item.meetupLocation || item.location || "Not specified"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Calendar size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold text-gray-700">Day</p>
                                                    <p className="text-gray-600">{item.meetupDay || "Not specified"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Clock size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold text-gray-700">Time</p>
                                                    <p className="text-gray-600">{item.meetupTime || "Not specified"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="text-sm">
                                                <span className="text-gray-500">Donor:</span> <span className="font-semibold">{item.donorName || "Anonymous"}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className="font-bold text-[#7db038]">FREE</span>
                                            </div>

                                            <div className="flex gap-3">
                                                <button onClick={() => navigate(`/chat-donation/${item.id}`)} className="flex items-center gap-2 px-4 py-2 bg-[#f2f9e6] text-[#7db038] rounded-xl font-bold hover:bg-[#e4f0d5] transition-colors">
                                                    <MessageCircle size={18} /> Chat with Donor
                                                </button>
                                                
                                                {/* Logic for Buttons */}
                                                {item.receiverDeliveryStatus === 'received' ? (
                                                     <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl font-bold border border-yellow-200">
                                                        <Clock size={18} /> Waiting for Donor
                                                     </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setConfirmModalItem(item)} 
                                                        disabled={updatingStatus === item.id} 
                                                        className="flex items-center gap-2 px-4 py-2 bg-[#7db038] text-white rounded-xl font-bold hover:bg-[#4a6b1d] transition-colors disabled:opacity-50"
                                                    >
                                                        {updatingStatus === item.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} />} Mark Received
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded-lg">
                                            After the donor confirms delivery, you must confirm receipt within 7 days, or the claim will be automatically completed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- SECTION 2: HISTORY (COMPLETED) --- */}
        <div>
             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" /> Claim History
             </h2>
             {historyClaims.length === 0 ? (
                <p className="text-gray-500 italic">No completed claims yet.</p>
             ) : (
                <div className="space-y-6">
                    {historyClaims.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-sm opacity-80 hover:opacity-100">
                            <div className="p-5 flex gap-5 items-center">
                                <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                    <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-sm text-gray-500">Donated by {item.donorName || "Anonymous"}</p>
                                    <p className="text-xs text-gray-400 mt-1">Completed: {item.completedAt?.toDate ? new Date(item.completedAt.toDate()).toLocaleDateString() : ''}</p>
                                </div>
                                <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center gap-2">
                                    <CheckCircle size={16}/> Claimed
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
        </div>

      </div>

      <ConfirmModal
        open={!!confirmModalItem}
        title="Mark as received?"
        message="Confirm that you have picked up this item from the donor?"
        confirmText="Confirm"
        cancelText="Cancel"
        onClose={() => setConfirmModalItem(null)}
        onConfirm={handleConfirmModalConfirm}
      />
    </div>
  );
};

export default MyClaimedItems;