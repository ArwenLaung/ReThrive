import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, MapPin, MessageCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { addEcoPoints } from '../../utils/ecoPoints';
import ConfirmModal from '../../components/ConfirmModal';

const MyPurchases = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingOrder, setCompletingOrder] = useState(null);
  const [updatingDelivery, setUpdatingDelivery] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    type: null, // 'received' | 'notReceived'
    order: null,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Query for orders bought by this user
      const q = query(
        collection(db, "orders"),
        where("buyerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const orderList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setOrders(orderList);
        setLoading(false);

        // Auto-mark as received after 7 days if buyer hasn't responded
        orderList.forEach(async (order) => {
          try {
            if (
              !order.deliveryStatus &&
              order.createdAt &&
              order.createdAt.toDate &&
              typeof order.createdAt.toDate === 'function'
            ) {
              const createdAtDate = order.createdAt.toDate();
              const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
              const isOverdue = Date.now() - createdAtDate.getTime() > sevenDaysMs;

              if (isOverdue) {
                await updateDoc(doc(db, "orders", order.id), {
                  deliveryStatus: 'auto_received',
                  deliveryUpdatedAt: serverTimestamp(),
                  autoCompleted: true,
                });
              }
            }
          } catch (err) {
            console.error("Error auto-marking order as received:", err);
          }
        });
      }, (error) => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleMarkAsReceived = async (orderId, order) => {
    setCompletingOrder(orderId);
    try {
      // Prepare updates: Always mark buyer side as 'received'
      const updates = {
        deliveryStatus: 'received',
        deliveryUpdatedAt: serverTimestamp(),
        autoCompleted: false,
        notificationForBuyer: false, // Clear buyer notification
      };

      // CHECK: Has the Seller already marked it as 'delivered'?
      const isSellerDelivered = order.sellerDeliveryStatus === 'delivered';

      // Only "Complete" the order if BOTH parties have confirmed
      if (isSellerDelivered) {
        updates.status = 'completed'; // Finalize Order
        updates.completedAt = serverTimestamp();
        updates.notificationForSeller = false; // Clear seller notification

        // Try to update Item to 'sold'. Catch error if already sold.
        if (order.itemId) {
           try {
             await updateDoc(doc(db, "items", order.itemId), { status: 'sold' });
           } catch (itemError) {
             // If item is already sold, this error happens. We ignore it so we can finish the Order.
             console.warn("Item status update skipped (likely already sold):", itemError.message);
           }
        }

        // Award EcoPoints to BOTH Buyer and Seller
        const pointsToEarn = 10;
        await addEcoPoints(order.buyerId, pointsToEarn); // Buyer
        if (order.sellerId) {
          await addEcoPoints(order.sellerId, pointsToEarn); // Seller
        }

      alert(`Transaction Complete! Both you and the seller earned ${pointsToEarn} EcoPoints!`);
      } else {
        // Seller hasn't clicked yet - notify seller
        updates.notificationForSeller = true;
        alert("Marked as Received! Waiting for Seller to mark as Delivered to complete the order.");
      }

      // 4. Apply the updates to the Order document
      await updateDoc(doc(db, "orders", orderId), updates);

      // Optimistic UI update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { 
                ...o, 
                deliveryStatus: 'received', 
                status: isSellerDelivered ? 'completed' : o.status // Update status only if finalized
              }
            : o
        )
      );

    } catch (error) {
      console.error("Error completing order:", error);
      alert("Failed to update order. Please try again.");
    } finally {
      setCompletingOrder(null);
    }
  };

  const handleMarkAsNotReceived = async (orderId) => {
    setUpdatingDelivery(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        deliveryStatus: 'not_received',
        deliveryUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      alert("Failed to update delivery status. Please try again.");
    } finally {
      setUpdatingDelivery(null);
    }
  };

  const handleConfirmModalConfirm = async () => {
    if (!confirmModal.type || !confirmModal.order) {
      setConfirmModal({ type: null, order: null });
      return;
    }

    const { type, order } = confirmModal;

    if (type === 'received') {
      await handleMarkAsReceived(order.id, order);
    } else if (type === 'notReceived') {
      await handleMarkAsNotReceived(order.id);
    }

    setConfirmModal({ type: null, order: null });
  };

  const handleConfirmModalClose = () => {
    setConfirmModal({ type: null, order: null });
  };

  const pendingOrders = orders.filter(o => o.status !== 'completed');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-green-600 shadow-sm">
            COMPLETED
          </span>
        );
      case 'issue_reported':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-red-600 shadow-sm">
            ISSUE REPORTED
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-yellow-600 shadow-sm">
            PENDING
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-yellow-600 shadow-sm">
            PENDING
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Purchases</h1>
      </div>

      {/* [MODIFICATION] Completely replaced the main content area to support sections */}
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* --- SECTION 1: PENDING ORDERS --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="text-yellow-600" /> Pending Orders
          </h2>
          {pendingOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 italic">
              No pending orders.
            </div>
          ) : (
            <div className="space-y-6">
              {pendingOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-yellow-200 shadow-sm hover:shadow-md transition-all">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Image */}
                      <div className="relative w-full md:w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img src={order.itemImage} alt={order.itemTitle} className="w-full h-full object-cover"/>
                        <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-[10px] font-bold rounded">PENDING</span>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{order.itemTitle}</h3>
                          <p className="text-sm text-gray-500">Order ID: {order.id.substring(0, 8)}...</p>
                        </div>

                        {/* [MODIFICATION] Pickup Details Block */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-700">Location</p>
                                    <p className="text-gray-600">{order.meetupLocation || "Not specified"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-700">Day</p>
                                    <p className="text-gray-600">{order.meetupDay || "Not specified"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock size={16} className="text-[#59287a] mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-700">Time</p>
                                    <p className="text-gray-600">{order.meetupTime || "Not specified"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                           <div className="text-sm">
                              <span className="text-gray-500">Seller:</span> <span className="font-semibold">{order.sellerName}</span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="font-bold text-brand-purple">RM {order.itemPrice}</span>
                           </div>

                           <div className="flex gap-3">
                              <button onClick={() => navigate(`/chat-item/${order.itemId}`)} className="flex items-center gap-2 px-4 py-2 bg-[#f3eefc] text-brand-purple rounded-xl font-bold hover:bg-[#e9dff7]">
                                <MessageCircle size={18} /> Chat with Seller
                              </button>
                              
                              {order.deliveryStatus !== 'received' && (
                                <button onClick={() => setConfirmModal({ type: 'received', order })} disabled={completingOrder === order.id} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                                  {completingOrder === order.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18} />} Received
                                </button>
                              )}
                              
                              {order.deliveryStatus === 'received' && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl font-bold border border-yellow-200">
                                   <Clock size={18} /> Waiting for Seller
                                </div>
                              )}
                           </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded-lg">
                          After the seller confirms delivery, you must confirm receipt within 7 days, or the order will be automatically completed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- SECTION 2: PURCHASE HISTORY (COMPLETED) --- */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" /> Purchase History
          </h2>
          {completedOrders.length === 0 ? (
            <p className="text-gray-500 italic">No completed orders yet.</p>
          ) : (
            <div className="space-y-6">
              {completedOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all opacity-80 hover:opacity-100">
                  <div className="p-5 flex gap-5 items-center">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                       <img src={order.itemImage} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                       <h3 className="font-bold text-gray-900">{order.itemTitle}</h3>
                       <p className="text-sm text-gray-500">Sold by {order.sellerName} • RM {order.itemPrice}</p>
                       <p className="text-xs text-gray-400 mt-1">Completed: {order.completedAt?.toDate ? order.completedAt.toDate().toLocaleDateString() : ''}</p>
                    </div>
                    <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm flex items-center gap-2">
                       <CheckCircle size={16}/> Completed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <ConfirmModal
        open={!!confirmModal.type}
        title={
          confirmModal.type === 'received'
            ? 'Mark as received?'
            : confirmModal.type === 'notReceived'
            ? 'Mark as not received?'
            : 'Confirm'
        }
        message={
          confirmModal.type === 'received'
            ? 'Confirm that you have received this item? You will earn EcoPoints!'
            : confirmModal.type === 'notReceived'
            ? 'Mark this order as NOT received yet?'
            : ''
        }
        confirmText="Confirm"
        cancelText="Cancel"
        onClose={handleConfirmModalClose}
        onConfirm={handleConfirmModalConfirm}
      />
    </div>
  );
};

export default MyPurchases;