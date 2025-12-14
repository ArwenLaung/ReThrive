import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Loader2, CreditCard, Leaf } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

const MyCart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [ecoPoints, setEcoPoints] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { navigate('/login'); return; }

      const q = query(collection(db, "carts"), where("userId", "==", user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const cartItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(cartItems);
        
        const sum = cartItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
        setTotal(sum);
        setEcoPoints(cartItems.length * 10);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const removeFromCart = async (id) => {
    if (window.confirm("Remove item from cart?")) {
      await deleteDoc(doc(db, "carts", id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-purple" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Shopping Cart</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-purple-50 p-6 rounded-full mb-6">
                <ShoppingCart className="text-brand-purple" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is currently empty</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Looks like you haven't added anything to your cart yet. Explore the marketplace to find great deals!
              </p>
              <Link 
                to="/marketplace" 
                className="bg-brand-purple text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* --- LEFT COLUMN: Cart Items --- */}
            <div className="lg:col-span-2 space-y-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex gap-6 items-center hover:shadow-md transition-shadow">
                  <div className="w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">Sold by {item.sellerName || 'Fellow Student'}</p>
                    <p className="text-2xl font-black text-brand-purple mt-2">RM {item.price}</p>
                  </div>

                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl hover:bg-red-50 transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              ))}
            </div>

            {/* --- RIGHT COLUMN: Checkout Summary --- */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-purple-500/5 border border-purple-50 sticky top-28">
                <h3 className="text-xl font-black text-gray-800 mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-gray-600 text-lg font-medium">
                    <span>Subtotal ({items.length} items)</span>
                    <span>RM {total}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-[#f0fdf4] p-3 rounded-xl border border-green-100">
                    <span className="text-green-700 font-bold flex items-center gap-2">
                      <Leaf size={18} /> EcoPoints to Earn
                    </span>
                    <span className="text-green-700 font-black">+{ecoPoints}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 mb-8 flex justify-between items-end">
                  <span className="text-gray-500 font-bold">Total Amount</span>
                  <span className="text-4xl font-black text-brand-purple">RM {total}</span>
                </div>

                <button className="w-full bg-brand-purple hover:bg-purple-800 text-white font-bold py-4 rounded-2xl hover:shadow-purple-500 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg">
                  <CreditCard size={22} /> 
                  Proceed to Checkout
                </button>
                
                <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                  Secure checkout powered by ReThrive
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCart;