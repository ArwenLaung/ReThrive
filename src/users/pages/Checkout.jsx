import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, Lock, MapPin, User, Mail, Phone, Clock, CalendarDays } from 'lucide-react';
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
  const [selectedPickupLocations, setSelectedPickupLocations] = useState({});
  const [selectedDays, setSelectedDays] = useState({});
  const [selectedTimes, setSelectedTimes] = useState({});

  const getDayOptions = (sellerDays) => {
    if (!sellerDays || sellerDays.length === 0) return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let options = new Set();
    sellerDays.forEach(type => {
      if (type.includes('Weekdays')) {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => options.add(d));
      } else if (type.includes('Weekends')) {
        ['Saturday', 'Sunday'].forEach(d => options.add(d));
      } else {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(d => options.add(d));
      }
    });
    return Array.from(options);
  };

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
    for (const item of items) {
      if (!selectedPickupLocations[item.id]) {
        alert(`Please select a location for ${item.title}`);
        return;
      }
      if (!selectedDays[item.id]) {
        alert(`Please select a meetup day for ${item.title}`);
        return;
      }
      if (!selectedTimes[item.id]) {
        alert(`Please select a meetup time for ${item.title}`);
        return;
      }
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
          meetupLocation: selectedPickup,
          meetupDay: selectedDays[cartItem.id],
          meetupTime: selectedTimes[cartItem.id],
          itemId: cartItem.itemId,
          itemTitle: cartItem.title,
          itemPrice: cartItem.price,
          itemImage: cartItem.image,
          sellerId: cartItem.sellerId,
          sellerName: cartItem.sellerName,
          status: 'pending',
          sellerDeliveryStatus: 'pending',
          deliveryStatus: 'pending',
          paymentMethod: paymentMethod,
          paymentStatus: 'paid',
          createdAt: serverTimestamp(),
          paidAt: serverTimestamp(),
        });

        // Update item status to sold
        if (cartItem.itemId) {
          try {
            await updateDoc(doc(db, "items", cartItem.itemId), {
              status: 'pending',
              buyerId: currentUser.uid,
              currentOrderId: orderRef.id,
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
        navigate('/mypurchases');
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

            {/* Meetup Configuration (Location + Day + Time) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule Meetups</h2>
              <div className="space-y-6">
                {items.map((item) => {
                  const availableLocations = item.sellerLocations || item.locations || (item.location ? [item.location] : []);

                  // Calculate Options
                  const dayOptions = getDayOptions(item.availabilityDays);
                  const timeSlots = item.availabilitySlots || ['Morning', 'Afternoon', 'Evening'];

                  return (
                    <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      {/* Item Info Header */}
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                          <p className="text-xs text-gray-500">Configure pickup details below</p>
                        </div>
                      </div>

                      {/* Grid for Selectors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 1. Location Selection */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                            <MapPin size={14} /> Location
                          </label>
                          <select
                            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#59287a] outline-none bg-white"
                            value={selectedPickupLocations[item.id] || ''}
                            onChange={(e) => handlePickupLocationChange(item.id, e.target.value)}
                          >
                            <option value="">Select Location...</option>
                            {availableLocations.map((loc, idx) => (
                              <option key={idx} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Day Selection */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                            <CalendarDays size={14} /> Day
                          </label>
                          <select
                            className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#59287a] outline-none bg-white"
                            value={selectedDays[item.id] || ''}
                            onChange={(e) => setSelectedDays({ ...selectedDays, [item.id]: e.target.value })}
                          >
                            <option value="">Select Day...</option>
                            {dayOptions.map((day, idx) => (
                              <option key={idx} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Time Selection (Slot + Specific) */}
                        <div className="col-span-1 md:col-span-2 space-y-2">
                          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                            <Clock size={14} /> Preferred Time
                          </label>
                          <div className="flex gap-3">
                            {/* Slot Helper Dropdown */}
                            <select
                              className="w-1/3 p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#59287a] outline-none bg-white"
                              onChange={(e) => {
                                // Pre-fill the specific input when a slot is chosen
                                const val = e.target.value;
                                if (val) {
                                  const current = selectedTimes[item.id] || "";
                                  // Just replace or append? Let's Replace for simplicity
                                  setSelectedTimes({ ...selectedTimes, [item.id]: val + ": " });
                                }
                              }}
                            >
                              <option value="">Slot...</option>
                              {timeSlots.map((slot, idx) => (
                                <option key={idx} value={slot.split(' ')[0]}>{slot}</option>
                                // splits "Morning (8am)" to just "Morning" for brevity
                              ))}
                            </select>

                            {/* Manual Time Input */}
                            <input
                              type="text"
                              placeholder="Specific Time (e.g. 6:30 PM)"
                              className="flex-1 p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#59287a] outline-none"
                              value={selectedTimes[item.id] || ''}
                              onChange={(e) => setSelectedTimes({ ...selectedTimes, [item.id]: e.target.value })}
                            />
                          </div>
                          <p className="text-xs text-gray-400">Choose a slot to autofill, then specify the exact time.</p>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[#59287a] transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-[#59287a]"
                  />
                  <CreditCard size={20} className="text-gray-600" />
                  <span className="font-semibold text-gray-900">Credit/Debit Card</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[#59287a] transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-[#59287a]"
                  />
                  <span className="font-semibold text-gray-900">Bank Transfer</span>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[#59287a] transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-5 h-5 text-[#59287a]"
                  />
                  <span className="font-semibold text-gray-900">Cash on Delivery</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-purple-50 sticky top-28">
              <h3 className="text-xl font-black text-gray-800 mb-6">Order Summary</h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600 text-lg font-medium">
                  <span>Subtotal ({items.length} items)</span>
                  <span>RM {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-gray-500 font-bold">Total Amount</span>
                  <span className="text-4xl font-black text-[#59287a]">RM {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-[#59287a] hover:bg-[#451d5e] text-white font-bold py-4 rounded-2xl hover:shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock size={22} />
                    Confirm & Pay
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