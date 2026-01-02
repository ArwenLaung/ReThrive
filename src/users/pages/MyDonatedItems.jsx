import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Loader2, Gift, MessageCircle, CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const MyDonatedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const q = query(
        collection(db, "donations"),
        where("donorId", "==", currentUser.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const allDonations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Only show items that are MARKED DELIVERED by the donor.
        const historyItems = allDonations.filter(item => 
          item.receiverId && item.donorDeliveryStatus === 'delivered'
        );
        
        // Sort by newest first
        historyItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setItems(historyItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching donated items:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#7db038]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-[#364f15] tracking-tight">My Donated Items</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-[#7db038]/10 p-6 rounded-full mb-6">
                <Gift className="text-[#7db038]" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No completed donations yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Items you mark as "Delivered" will appear here.
              </p>
              <Link to="/mydonations" className="bg-[#7db038] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#4a6b1d] transition-all shadow-lg hover:shadow-green-200 active:scale-95">
                Go to My Donations
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => {
              const isFullyCompleted = item.status === 'completed' || (item.donorDeliveryStatus === 'delivered' && item.receiverDeliveryStatus === 'received');

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Image */}
                      <div className="relative w-full md:w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover grayscale-[0.3]"
                        />
                        <div className="absolute top-2 left-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                              isFullyCompleted ? 'bg-green-600' : 'bg-green-600'
                            }`}
                          >
                            {isFullyCompleted ? 'COMPLETED' : 'DELIVERED'}
                          </span>
                        </div>
                      </div>

                      {/* Details + actions */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={12} />
                            <span>{item.location}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            onClick={() => navigate(`/chat-donation/${item.id}`)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[150px] bg-brand-purple text-white rounded-xl font-semibold hover:bg-purple-800 transition-all active:scale-95"
                          >
                            <MessageCircle size={18} />
                            Chat with Receiver
                          </button>

                          {isFullyCompleted ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold">
                              <CheckCircle size={18} />
                              Successfully Given
                            </div>
                          ) : (
                             <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl font-semibold">
                               <Loader2 size={18} className="animate-spin" /> 
                               Waiting for Receiver to Confirm
                             </div>
                          )}

                          <Link
                            to={`/donation/${item.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-95"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonatedItems;