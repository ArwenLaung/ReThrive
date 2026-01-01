import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Trash2, MapPin, Loader2, MessageCircle, Clock, Package, CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MyDonations = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const handleMarkDelivered = async (item) => {
    setUpdatingId(item.id);
    try {
      await updateDoc(doc(db, "donations", item.id), {
        donorDeliveryStatus: 'delivered',
        donorDeliveryUpdatedAt: serverTimestamp(),
        notificationForDonor: false, // Clear donor notification
        notificationForReceiver: true, // Notify receiver that donor marked as delivered
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  // --- FILTERING LOGIC ---
  // 1. Active: No receiver yet
  const activeItems = items.filter(item => !item.receiverId);
  
  // 2. Pending Claims: Has receiver, but YOU haven't marked delivered yet
  const pendingClaims = items.filter(item => item.receiverId && item.donorDeliveryStatus !== 'delivered');
  
  // 3. History: Has receiver AND you marked it delivered
  const historyItems = items.filter(item => item.receiverId && item.donorDeliveryStatus === 'delivered');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#7db038]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black text-[#364f15]">My Donations</h1>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* --- SECTION 1: PENDING CLAIMS (Not Delivered Yet) --- */}
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
                        <span className="absolute top-2 left-2 px-2 py-1 bg-gray-500 text-white text-[10px] font-bold rounded">CLAIMED</span>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-500">Category: {item.category || 'General'}</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-700">Location</p>
                                    <p className="text-gray-600">{item.location || "Not specified"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Gift size={16} className="text-[#7db038] mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-700">Receiver</p>
                                    <p className="text-gray-600">{item.receiverName || "Student"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                           <button onClick={() => navigate(`/chat-donation/${item.id}`)} className="flex items-center gap-2 px-5 py-2.5 bg-[#7db038] text-white rounded-xl font-bold hover:bg-[#4a6b1d] transition-colors">
                             <MessageCircle size={18} /> Chat with Receiver
                           </button>

                           {/* Mark Delivered Button - Only shows here */}
                           <button 
                             onClick={() => handleMarkDelivered(item)}
                             disabled={updatingId === item.id}
                             className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                           >
                             {updatingId === item.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} />} 
                             Mark Delivered
                           </button>

                           <Link to={`/mydonation/${item.id}`} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                             View Details
                           </Link>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 p-2 bg-[#7db038]/5 rounded-lg">
                          Please confirm delivery within 7 days, or this donation will be automatically marked as completed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 2: ACTIVE LISTINGS --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="text-green-600" /> Active Listings
          </h2>
          
          {activeItems.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] text-center border border-gray-100 flex flex-col items-center justify-center">
               <div className="bg-[#f2f9e6] p-4 rounded-full mb-4">
                 <Gift size={32} className="text-[#7db038]" />
               </div>
               <p className="text-gray-500">You have no active donations.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="relative w-full md:w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                        <span className="absolute top-2 left-2 px-2 py-1 bg-[#7db038] text-white text-[10px] font-bold rounded">ACTIVE</span>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                           <div>
                              <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                              <p className="text-sm text-gray-500">Listed on: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}</p>
                           </div>
                           <p className="text-[#7db038] font-black text-lg">FREE</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                           <MapPin size={14} /> {item.location}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                           <Link to={`/mydonation/${item.id}`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                             View / Edit
                           </Link>
                           <button onClick={(e) => handleDelete(item.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">
                             <Trash2 size={18} /> Delete
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 3: DONATION HISTORY (Delivered Items) --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" /> Donation History
          </h2>
          
          {historyItems.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 italic">
               No delivered donations yet.
             </div>
          ) : (
            <div className="space-y-6">
              {historyItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all opacity-80 hover:opacity-100">
                  <div className="p-5 flex gap-5 items-center">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                       <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-gray-900">{item.title}</h3>
                       <p className="text-sm text-gray-500">
                         Given to {item.receiverName || "Student"}
                       </p>
                       <p className="text-xs text-gray-400 mt-1">
                         Delivered on: {item.donorDeliveryUpdatedAt?.toDate ? item.donorDeliveryUpdatedAt.toDate().toLocaleDateString() : 'Recent'}
                       </p>
                    </div>
                    <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center gap-2">
                       <CheckCircle size={16}/> Delivered
                    </div>
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
    </div>
  );
};

export default MyDonations;