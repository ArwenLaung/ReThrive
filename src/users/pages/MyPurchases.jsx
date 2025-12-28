import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, MapPin, MessageCircle, CheckCircle, Clock } from 'lucide-react';
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
      // Update order status
      await updateDoc(doc(db, "orders", orderId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        deliveryStatus: 'received',
        autoCompleted: false,
      });

      // Optimistically update local state so UI changes immediately
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'completed', deliveryStatus: 'received' }
            : o
        )
      );

      // Award ecoPoints (10 points per item)
      const pointsToEarn = 10;
      await addEcoPoints(order.buyerId, pointsToEarn);

      alert(`Order completed! You earned ${pointsToEarn} EcoPoints!`);
    } catch (error) {
      console.error("Error completing order:", error);
      alert("Failed to complete order. Please try again.");
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

      <div className="max-w-6xl mx-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full mt-10">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-[#f3eefc] p-6 rounded-full mb-6">
                <ShoppingBag size={64} className="text-[#59287a]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No purchases yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Items you buy will appear here. Start browsing to find great deals!
              </p>
              <Link to="/marketplace" className="bg-brand-purple text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95">
                Browse Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Item Image */}
                    <div className="relative w-full md:w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <img 
                        src={order.itemImage} 
                        alt={order.itemTitle} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{order.itemTitle}</h3>
                        <p className="text-sm text-gray-500">Order ID: {order.id.substring(0, 8)}...</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Seller:</span>
                          <span className="font-semibold text-gray-900 ml-2">{order.sellerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="font-bold text-brand-purple ml-2">RM {order.itemPrice}</span>
                        </div>
                        {order.createdAt && (
                          <div>
                            <span className="text-gray-500">Ordered:</span>
                            <span className="text-gray-700 ml-2">
                              {order.createdAt.toDate ? 
                                new Date(order.createdAt.toDate()).toLocaleDateString() :
                                'Recently'
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => {
                            if (!order.itemId) return;
                            // Use the same item-based chat thread as "Contact Seller"
                            navigate(`/chat-item/${order.itemId}`);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-xl font-semibold hover:bg-purple-800 transition-all active:scale-95"
                        >
                          <MessageCircle size={18} />
                          Chat with Seller
                        </button>
                        
                        {/* Delivery status: Received / Not received */}
                        {(order.deliveryStatus !== 'received' && order.deliveryStatus !== 'auto_received') && (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: 'received',
                                order,
                              })
                            }
                            disabled={completingOrder === order.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {completingOrder === order.id ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Received
                              </>
                            )}
                          </button>
                        )}

                        {(order.deliveryStatus === 'received' || order.deliveryStatus === 'auto_received') && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold">
                            <CheckCircle size={18} />
                            {order.deliveryStatus === 'auto_received' ? 'Automatically marked as received' : 'Received'}
                          </div>
                        )}

                        {(order.deliveryStatus !== 'received' && order.deliveryStatus !== 'auto_received') && (
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: 'notReceived',
                                order,
                              })
                            }
                            disabled={updatingDelivery === order.id}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingDelivery === order.id ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Clock size={18} />
                                Not received
                              </>
                            )}
                          </button>
                        )}

                        {order.itemId && (
                          <Link
                            to={`/item/${order.itemId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-95"
                          >
                            View Item
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        If you do not update this status within 7 days after purchase, it will automatically be marked as <span className="font-semibold">received</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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