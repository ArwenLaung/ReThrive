import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Trash2, MapPin, Loader2, MessageCircle, Clock, Package, CheckCircle, Calendar, Edit } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, getDoc, increment } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MyDonations = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmDeliveryItem, setConfirmDeliveryItem] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { navigate('/login'); return; }

      const q = query(collection(db, "donations"), where("donorId", "==", currentUser.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const userItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        userItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setItems(userItems);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleDelete = (itemId) => {
    setDeleteTarget(itemId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "donations", deleteTarget));
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelivery = async () => {
      if (!confirmDeliveryItem) return;
      const item = confirmDeliveryItem;
      setUpdatingId(item.id);
      setConfirmDeliveryItem(null); 

      try {
        const donationRef = doc(db, "donations", item.id);
        const donationSnap = await getDoc(donationRef);
        
        if (!donationSnap.exists()) return;
        const data = donationSnap.data();

        const updates = {
          donorDeliveryStatus: 'delivered',
          donorDeliveryUpdatedAt: serverTimestamp(),
          notificationForDonor: false, 
        };

        let transactionComplete = false;

        if (data.receiverDeliveryStatus === 'received') {
          updates.status = 'completed';
          updates.completedAt = serverTimestamp();
          updates.notificationForReceiver = false; 
          transactionComplete = true;

          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            ecoPoints: increment(10)
          });

        } else {
          updates.notificationForReceiver = true;
        }

        await updateDoc(donationRef, updates);

        if (transactionComplete) {
          alert("Transaction complete! You have earned 10 EcoPoints.");
        } else {
        }

      } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status. Please try again.");
      } finally {
        setUpdatingId(null);
      }
    };

  // Active: No receiver yet
  const activeItems = items.filter(item => !item.receiverId);
  // Pending Claims: Has receiver AND is not fully completed yet
  const pendingClaims = items.filter(item => item.receiverId && item.status !== 'completed');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#7db038]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-[#364f15]">My Donations</h1>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* PENDING CLAIMS */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="text-yellow-600" /> Pending Claims
          </h2>
          
          {pendingClaims.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 italic">
               No pending claims right now.
             </div>
          ) : (
            <div className="space-y-6">
              {pendingClaims.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-yellow-200 shadow-sm hover:shadow-md transition-all">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      
                      {/* Image */}
                      <div className="relative w-full md:w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                        <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded">CLAIMED</span>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-500">Category: {item.category || 'General'}</p>
                        </div>

                        {/* Details Grid */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                <div><p className="font-bold text-gray-700">Location</p><p className="text-gray-600">{item.meetupLocation || item.location || "Not specified"}</p></div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                <div><p className="font-bold text-gray-700">Day</p><p className="text-gray-600">{item.meetupDay || "Not specified"}</p></div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                <div><p className="font-bold text-gray-700">Time</p><p className="text-gray-600">{item.meetupTime || "Not specified"}</p></div>
                            </div>
                        </div>

                        {/* Bottom Bar: Receiver Info + Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                           <div className="text-sm">
                              <span className="text-gray-500">Receiver:</span> <span className="font-semibold">{item.receiverName || "Student"}</span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="font-bold text-[#7db038]">FREE</span>
                           </div>

                           <div className="flex gap-3">
                              <button onClick={() => navigate(`/chat-donation/${item.id}`)} className="flex items-center gap-2 px-4 py-2 bg-[#f2f9e6] text-[#7db038] rounded-xl font-bold hover:bg-[#e4f0d5] transition-colors">
                                 <MessageCircle size={18} /> Chat with Receiver
                              </button>

                              {/* Button Logic similar to MyListings */}
                              {item.donorDeliveryStatus === 'delivered' ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl font-bold border border-yellow-200">
                                   <Clock size={18} /> Waiting for Receiver
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setConfirmDeliveryItem(item)}
                                  disabled={updatingId === item.id}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#7db038] text-white rounded-xl font-bold hover:bg-[#4a6b1d] transition-colors disabled:opacity-50"
                                >
                                  {updatingId === item.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} />} 
                                  Mark Delivered
                                </button>
                              )}
                           </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-lg">
                          After the receiver confirms receipt, you must confirm delivery within 7 days, or it will be automatically completed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: ACTIVE LISTINGS */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="text-green-600" /> Active Listings
          </h2>
          
          {activeItems.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] text-center border border-gray-100 flex flex-col items-center justify-center">
               <div className="bg-[#f2f9e6] p-4 rounded-full mb-4">
                 <Gift size={32} className="text-[#7db038]" />
               </div>
               <p className="text-gray-500 mb-4">You have no active donations.</p>
               <Link to="/donateitem" className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-bold">Donate Now</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center hover:shadow-md transition-shadow">
                  <div className="w-full md:w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                    <div className="absolute top-1 left-1 bg-[#7db038] text-white text-[10px] font-bold px-2 py-0.5 rounded">ACTIVE</div>
                  </div>

                  <div className="flex-1 w-full text-center md:text-left">
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-[#7db038] font-bold">FREE</p>
                    <div className="text-xs text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1">
                        <MapPin size={12}/> {item.location}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center md:justify-end">
                     <Link to={`/mydonation/${item.id}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                       <Edit size={16} /> Edit
                     </Link>
                     <button onClick={(e) => handleDelete(item.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                       <Trash2 size={16} /> Delete
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete donation?"
        message="Are you sure you want to delete this donation? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmModal
        open={!!confirmDeliveryItem}
        title="Mark as Delivered?"
        message="Confirm that you have handed this item to the receiver?"
        confirmText="Yes, Delivered"
        cancelText="Cancel"
        onClose={() => setConfirmDeliveryItem(null)}
        onConfirm={handleConfirmDelivery}
      />
    </div>
  );
};

export default MyDonations;