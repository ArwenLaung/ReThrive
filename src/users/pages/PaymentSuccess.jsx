import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, MessageCircle, ArrowRight, Home } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const PaymentSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  // Auto-redirect to My Purchases after a short delay
  useEffect(() => {
    if (!order) return;

    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/purchasehistory');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-6 py-20">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="text-green-600" size={64} />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your order has been confirmed and is being processed.
          </p>

          {order && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-semibold text-gray-900">{order.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-semibold text-gray-900">{order.itemTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-bold text-brand-purple text-lg">RM {order.itemPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seller:</span>
                  <span className="font-semibold text-gray-900">{order.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    {order.status === 'pending' ? 'Pending Confirmation' : order.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={`/chat/${orderId}`}
              className="flex items-center justify-center gap-2 bg-brand-purple text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95"
            >
              <MessageCircle size={20} />
              Chat with Seller
            </Link>
            <Link
              to="/purchasehistory"
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
            >
              <ShoppingBag size={20} />
              View Orders
            </Link>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <Home size={20} />
              Go Home
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-1">
              You can track your order status and communicate with the seller from your purchase history.
            </p>
            <p className="text-xs text-gray-400">
              Redirecting to <span className="font-semibold">My Purchases</span> in {redirectCountdown}s...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;









