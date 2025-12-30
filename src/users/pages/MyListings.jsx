import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Trash2, MapPin, Loader2, MessageCircle, CheckCircle, Clock, Edit, Calendar } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { addEcoPoints } from '../../utils/ecoPoints';
import ConfirmModal from '../../components/ConfirmModal';

const MyListings = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingOrdersDetails, setPendingOrdersDetails] = useState({});

  // Check Auth & Fetch Data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Real-time Listener for User's Items
      const q = query(
        collection(db, "items"),
        where("sellerId", "==", currentUser.uid),
        where("status", "in", ["active", "pending"])
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const userItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Client-side sort by date (newest first)
        userItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setItems(userItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching listings:", error);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const pendingItems = items.filter(i => i.status === 'pending' && i.currentOrderId);
      if (pendingItems.length === 0) return;

      const detailsMap = {};
      await Promise.all(pendingItems.map(async (item) => {
        try {
          // Fetch the Order Document linked to this item
          const orderSnap = await getDoc(doc(db, "orders", item.currentOrderId));
          if (orderSnap.exists()) {
            detailsMap[item.id] = orderSnap.data();
          }
        } catch (e) {
          console.error("Error fetching order detail:", e);
        }
      }));
      setPendingOrdersDetails(prev => ({...prev, ...detailsMap}));
    };

    if (items.length > 0) {
      fetchOrderDetails();
    }
  }, [items]);

  // Seller marks item as delivered
  const handleMarkDelivered = async (item) => {
    if (!item.currentOrderId) {
        alert("Error: Order link missing. Cannot update status.");
        return;
    }
    setUpdatingId(item.id);

    try {
      const orderRef = doc(db, "orders", item.currentOrderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data();

      // Update Seller Status
      const updates = { sellerDeliveryStatus: 'delivered', sellerDeliveryUpdatedAt: serverTimestamp() };
      
      // Check has Buyer already received? If yes -> finalize transaction
      if (orderData.deliveryStatus === 'received') {
        updates.status = 'completed';
        updates.completedAt = serverTimestamp();
        
        // Finalize Item
        await updateDoc(doc(db, "items", item.id), { status: 'sold' });
        
        // Award Points (Both parties)
        await addEcoPoints(orderData.buyerId, 10);
        if (orderData.sellerId) await addEcoPoints(orderData.sellerId, 10);
        
        alert("Transaction Completed! 10 EcoPoints awarded.");
      } else {
        alert("Marked as Delivered. Waiting for Buyer confirmation.");
      }

      await updateDoc(orderRef, updates);

    } catch (error) {
      console.error("Error updating:", error);
      alert("Update failed.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (itemId) => setDeleteTarget(itemId);
  const handleConfirmDelete = async () => {
    if (deleteTarget) await deleteDoc(doc(db, "items", deleteTarget));
    setDeleteTarget(null);
  };

  const pendingItems = items.filter(i => i.status === 'pending');
  const activeItems = items.filter(i => i.status === 'active');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Listings</h1>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* --- SECTION 1: PENDING ORDERS --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="text-yellow-600" /> Pending Orders</h2>
          {pendingItems.length === 0 ? <p className="text-gray-500 italic bg-white p-6 rounded-2xl">No pending orders.</p> : (
            <div className="space-y-6">
              {pendingItems.map(item => {
                // Get the extra details fetched in useEffect
                const orderDetail = pendingOrdersDetails[item.id];

                return (
                  <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-yellow-200 shadow-sm hover:shadow-md transition-all">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        
                        {/* Image */}
                        <div className="relative w-full md:w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                          <span className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded">PENDING</span>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          {/* Title + Order ID Section */}
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-500">
                                Order ID: {item.currentOrderId ? item.currentOrderId.substring(0, 8) : '...'}...
                            </p>
                          </div>

                          {/* Pickup Details Block */}
                          {orderDetail && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPin size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                    <div><p className="font-bold text-gray-700">Location</p><p className="text-gray-600">{orderDetail.meetupLocation || "Not specified"}</p></div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Calendar size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                    <div><p className="font-bold text-gray-700">Day</p><p className="text-gray-600">{orderDetail.meetupDay || "Not specified"}</p></div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Clock size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                    <div><p className="font-bold text-gray-700">Time</p><p className="text-gray-600">{orderDetail.meetupTime || "Not specified"}</p></div>
                                </div>
                            </div>
                          )}

                          {/* Footer with Buyer Info and Buttons aligned right */}
                          <div className="flex flex-wrap items-center justify-between gap-4">
                             <div className="text-sm">
                                <span className="text-gray-500">Buyer:</span> <span className="font-semibold">{orderDetail?.buyerName || "Loading..."}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                <span className="font-bold text-brand-purple">RM {item.price}</span>
                             </div>

                             <div className="flex gap-3">
                                <button 
                                  onClick={() => {
                                    if (orderDetail && orderDetail.buyerId) {
                                      // Create the specific Chat ID: ItemID_BuyerID
                                      const chatId = `${item.id}_${orderDetail.buyerId}`;
                                      navigate(`/chat-item/${item.id}?chatId=${chatId}`);
                                    } else {
                                      // Fallback if data is missing
                                      navigate(`/chat-item/${item.id}`);
                                    }
                                  }} 
                                  className="flex items-center gap-2 px-4 py-2 bg-[#f3eefc] text-brand-purple rounded-xl font-bold hover:bg-[#e9dff7]"
                                >
                                  <MessageCircle size={18} /> Chat with Buyer
                                </button>
                                
                                <button onClick={() => handleMarkDelivered(item)} disabled={updatingId === item.id} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                                  {updatingId === item.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} />} Mark Delivered
                                </button>
                             </div>
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

        {/* --- SECTION 2: ACTIVE LISTINGS --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="text-green-600" /> Active Listings
          </h2>
          {activeItems.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                <p className="text-gray-500 mb-4">You have no active items for sale.</p>
                <Link to="/sellitem" className="bg-brand-purple text-white px-6 py-3 rounded-xl font-bold">Sell Item</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-center hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="w-full md:w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover"/>
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">ACTIVE</div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-brand-purple font-bold">RM {item.price}</p>
                    <div className="text-xs text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1">
                        <MapPin size={12}/> {item.location}
                    </div>
                  </div>

                  {/* Actions for Active */}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-end">
                    <button 
                      onClick={() => navigate(`/chat-item/${item.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f3eefc] text-brand-purple rounded-xl text-sm font-bold hover:bg-[#e9dff7] transition-all"
                    >
                      <MessageCircle size={16}/> Chat with Buyers
                    </button>

                    <Link 
                      to={`/listing/${item.id}`} // Takes you to Update Listing Page
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all"
                    >
                      <Edit size={16}/> Edit
                    </Link>

                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={16}/> Delete
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
        title="Delete listing?"
        message="Are you sure you want to delete this listing? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MyListings;