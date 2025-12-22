import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, Lock, MapPin, User, Mail, Phone } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { addEcoPoints } from '../../utils/ecoPoints';

const Checkout = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedPickupLocations, setSelectedPickupLocations] = useState({}); // { itemId: selectedLocation }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
      setName(user.displayName || '');
      setEmail(user.email || '');

      const q = query(collection(db, "carts"), where("userId", "==", user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const cartItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(cartItems);
        
        // Initialize pickup location selections - default to first available location
        const initialLocations = {};
        cartItems.forEach(item => {
          const availableLocations = item.sellerLocations || item.locations || (item.location ? [item.location] : []);
          if (availableLocations.length > 0 && !initialLocations[item.id]) {
            initialLocations[item.id] = availableLocations[0];
          }
        });
        setSelectedPickupLocations(initialLocations);
        
        const sum = cartItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
        setTotal(sum);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handlePickupLocationChange = (itemId, location) => {
    setSelectedPickupLocations(prev => ({
      ...prev,
      [itemId]: location
    }));
  };

  const handleCheckout = async () => {
    if (!name || !email || !phone) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate that all items have a pickup location selected
    const missingLocations = items.filter(item => !selectedPickupLocations[item.id]);
    if (missingLocations.length > 0) {
      alert("Please select a pickup location for all items.");
      return;
    }

    if (items.length === 0) {
      alert("Your cart is empty.");
      navigate('/mycart');
      return;
    }

    setProcessing(true);

    try {
      // Create order for each item
      const orderPromises = items.map(async (cartItem) => {
        // Create order document
        const selectedPickup = selectedPickupLocations[cartItem.id] || 
          (cartItem.sellerLocations && cartItem.sellerLocations[0]) || 
          (cartItem.locations && cartItem.locations[0]) || 
          cartItem.location || '';
        const orderRef = await addDoc(collection(db, "orders"), {
          buyerId: currentUser.uid,
          buyerName: name,
          buyerEmail: email,
          buyerPhone: phone,
          buyerAddress: selectedPickup,
          selectedPickupLocation: selectedPickup,
          itemId: cartItem.itemId,
          itemTitle: cartItem.title,
          itemPrice: cartItem.price,
          itemImage: cartItem.image,
          sellerId: cartItem.sellerId,
          sellerName: cartItem.sellerName,
          status: 'pending', // pending -> confirmed -> completed
          paymentMethod: paymentMethod,
          paymentStatus: 'paid',
          createdAt: serverTimestamp(),
          paidAt: serverTimestamp(),
        });

        // Update item status to sold
        if (cartItem.itemId) {
          try {
            await updateDoc(doc(db, "items", cartItem.itemId), {
              status: 'sold',
              buyerId: currentUser.uid,
              soldAt: serverTimestamp(),
            });
          } catch (error) {
            console.error("Error updating item status:", error);
          }
        }

        // Remove from cart
        await deleteDoc(doc(db, "carts", cartItem.id));

        return orderRef.id;
      });

      const orderIds = await Promise.all(orderPromises);
      
      // All orders created successfully
      if (orderIds && orderIds.length > 0) {
        alert("Payment successful! Your order has been created.");
        navigate('/purchasehistory');
      }
    } catch (error) {
      console.error("Error processing checkout:", error);
      setProcessing(false);
      alert(error?.message || "Failed to process payment. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-purple" size={48} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Your cart is empty</p>
          <button
            onClick={() => navigate('/mycart')}
            className="bg-brand-purple text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-800"
          >
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-8">
        <button
          onClick={() => navigate('/mycart')}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-purple transition-colors mb-6"
        >
          <ArrowLeft size={20} /> <span className="font-medium">Back to Cart</span>
        </button>
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">Checkout</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Order Details & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">Sold by {item.sellerName}</p>
                    </div>
                    <p className="text-xl font-black text-brand-purple">RM {item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                      placeholder="012-345-6789"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup Location Selection */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pickup Locations</h2>
              <div className="space-y-4">
                {items.map((item) => {
                  const availableLocations = item.sellerLocations || item.locations || (item.location ? [item.location] : []);
                  const selectedLocation = selectedPickupLocations[item.id] || availableLocations[0] || '';
                  
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={item.image} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                          <p className="text-xs text-gray-500">Select pickup location</p>
                        </div>
                      </div>
                      {availableLocations.length > 0 ? (
                        <div className="space-y-2">
                          {availableLocations.map((location, idx) => (
                            <label
                              key={idx}
                              className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                                selectedLocation === location
                                  ? 'border-brand-purple bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`pickup-${item.id}`}
                                value={location}
                                checked={selectedLocation === location}
                                onChange={() => handlePickupLocationChange(item.id, location)}
                                className="w-4 h-4 text-brand-purple"
                              />
                              <MapPin size={16} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">{location}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No pickup locations available</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-brand-purple transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-brand-purple"
                  />
                  <CreditCard size={20} className="text-gray-600" />
                  <span className="font-semibold text-gray-900">Credit/Debit Card</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-brand-purple transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-brand-purple"
                  />
                  <span className="font-semibold text-gray-900">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-brand-purple transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-brand-purple"
                  />
                  <span className="font-semibold text-gray-900">Cash on Delivery</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-purple-50 sticky top-28">
              <h3 className="text-xl font-black text-gray-800 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600 text-lg font-medium">
                  <span>Subtotal ({items.length} items)</span>
                  <span>RM {total.toFixed(2)}</span>
                </div>
                {/* Shipping removed - no shipping fee */}
              </div>

              <div className="border-t border-gray-100 pt-6 mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-gray-500 font-bold">Total Amount</span>
                  <span className="text-4xl font-black text-brand-purple">RM {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-brand-purple hover:bg-purple-800 text-white font-bold py-4 rounded-2xl hover:shadow-purple-500 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={22} />
                    Complete Payment
                  </>
                )}
              </button>
              
              <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                Secure checkout powered by ReThrive
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;









