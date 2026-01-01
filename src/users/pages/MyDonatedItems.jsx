import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Loader2, Gift, MessageCircle, CheckCircle, Clock } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const MyDonatedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState(null);

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

        // Filter: Only keep items that have been claimed (have a receiverId)
        const donatedItems = allDonations.filter(item => item.receiverId);
        
        // Sort by newest first
        donatedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setItems(donatedItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching donated items:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleMarkDelivered = async (donationId) => {
    setUpdatingDeliveryId(donationId);
    try {
      // Optimistic UI update
      setItems((prev) =>
        prev.map((item) =>
          item.id === donationId ? { ...item, donorDeliveryStatus: 'delivered' } : item
        )
      );

      await updateDoc(doc(db, 'donations', donationId), {
        donorDeliveryStatus: 'delivered',
        donorDeliveryUpdatedAt: serverTimestamp(),
        notificationForDonor: false, // Clear donor notification
        notificationForReceiver: true, // Notify receiver that donor marked as delivered
      });
    } catch (error) {
      console.error('Error marking donation as delivered:', error);
      alert('Failed to update delivery status. Please try again.');
      // Revert on error
      setItems((prev) =>
        prev.map((item) =>
          item.id === donationId ? { ...item, donorDeliveryStatus: null } : item
        )
      );
    } finally {
      setUpdatingDeliveryId(null);
    }
  };

  const getStatusBadge = (item) => {
    const fullyCompleted =
      item.donorDeliveryStatus === 'delivered' &&
      item.receiverStatus === 'received';
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
        {fullyCompleted ? 'CLAIMED' : 'PENDING'}
      </span>
    );
  };

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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No items given away yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Items you donate that get claimed by the community will appear here.
              </p>
              <Link to="/donateitem" className="bg-[#7db038] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#4a6b1d] transition-all shadow-lg hover:shadow-green-200 active:scale-95">
                Donate an Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
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
                            item.donorDeliveryStatus === 'delivered' &&
                            item.receiverStatus === 'received'
                              ? 'bg-green-600'
                              : 'bg-yellow-600'
                          }`}
                        >
                          {item.donorDeliveryStatus === 'delivered' &&
                          item.receiverStatus === 'received'
                            ? 'CLAIMED'
                            : 'PENDING'}
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

                      {/* Action buttons – similar to MySoldItems */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => navigate(`/chat-donation/${item.id}`)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[150px] bg-brand-purple text-white rounded-xl font-semibold hover:bg-purple-800 transition-all active:scale-95"
                        >
                          <MessageCircle size={18} />
                          Chat with Receiver
                        </button>

                        {/* Donor delivery status controls */}
                        {!item.donorDeliveryStatus && (
                          <button
                            onClick={() => handleMarkDelivered(item.id)}
                            disabled={updatingDeliveryId === item.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingDeliveryId === item.id ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Updating...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Mark Delivered
                              </>
                            )}
                          </button>
                        )}

                        {item.donorDeliveryStatus === 'delivered' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold">
                            <CheckCircle size={18} />
                            Marked as delivered
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonatedItems;