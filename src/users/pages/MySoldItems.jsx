import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, MapPin, Loader2, DollarSign, MessageCircle, CheckCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MySoldItems = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [confirmModalOrder, setConfirmModalOrder] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Query for orders where this user is the seller
      const q = query(
        collection(db, "orders"),
        where("sellerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const orderList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setOrders(orderList);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleConfirmOrder = async (orderId) => {
    setConfirmingOrder(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
      });
      alert("Order confirmed successfully!");
    } catch (error) {
      console.error("Error confirming order:", error);
      alert("Failed to confirm order. Please try again.");
    } finally {
      setConfirmingOrder(null);
    }
  };

  const handleConfirmOrderClick = (order) => {
    setConfirmModalOrder(order);
  };

  const handleConfirmModalConfirm = async () => {
    if (!confirmModalOrder) {
      setConfirmModalOrder(null);
      return;
    }
    await handleConfirmOrder(confirmModalOrder.id);
    setConfirmModalOrder(null);
  };

  const handleConfirmModalClose = () => {
    setConfirmModalOrder(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-green-600 shadow-sm">
            COMPLETED
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-blue-600 shadow-sm">
            CONFIRMED
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
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Sold Items</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-purple-50 p-6 rounded-full mb-6">
                <DollarSign className="text-brand-purple" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Orders for your items will appear here once buyers make purchases.
              </p>
              <Link to="/mylistings" className="bg-brand-purple text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95">
                Manage My Listings
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
                          <span className="text-gray-500">Buyer:</span>
                          <span className="font-semibold text-gray-900 ml-2">{order.buyerName}</span>
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
                        {order.buyerAddress && (
                          <div className="w-full">
                            <span className="text-gray-500">Delivery Address:</span>
                            <span className="text-gray-700 ml-2">{order.buyerAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => navigate(`/chat/${order.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-xl font-semibold hover:bg-purple-800 transition-all active:scale-95"
                        >
                          <MessageCircle size={18} />
                          Chat with Buyer
                        </button>

                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmOrderClick(order)}
                            disabled={confirmingOrder === order.id}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {confirmingOrder === order.id ? (
                              <>
                                <Loader2 className="animate-spin" size={18} />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Confirm Order
                              </>
                            )}
                          </button>
                        )}

                        {order.status === 'confirmed' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold">
                            <CheckCircle size={18} />
                            Confirmed
                          </div>
                        )}

                        {order.status === 'completed' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold">
                            <CheckCircle size={18} />
                            Completed
                          </div>
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!confirmModalOrder}
        title="Confirm order?"
        message="Confirm this order? The buyer will be notified."
        confirmText="Confirm"
        cancelText="Cancel"
        onClose={handleConfirmModalClose}
        onConfirm={handleConfirmModalConfirm}
      />
    </div>
  );
};

export default MySoldItems;
