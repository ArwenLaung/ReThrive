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

  // Selections per item ID
  const [selectedPickupLocations, setSelectedPickupLocations] = useState({});
  const [selectedDays, setSelectedDays] = useState({});
  const [selectedTimes, setSelectedTimes] = useState({}); // Text input (e.g. "9:00 AM")
  const [selectedSlots, setSelectedSlots] = useState({}); // Dropdown selection (e.g. "Morning...")

  // VALIDATION HELPERS
  const isPhoneValid = (phoneStr) => {
    if (!phoneStr) return true;
    const cleanPhone = phoneStr.replace(/\D/g, '');
    return /^6?01\d{8,9}$/.test(cleanPhone);
  };

  // Helper to convert "9:00 AM" to minutes (e.g. 540)
  const parseTimeToMinutes = (timeStr) => {
    const match = timeStr.match(/((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm]))/);
    if (!match) return null;

    let [_, __, hours, minutes, modifier] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    modifier = modifier.toUpperCase();

    if (hours === 12) {
      hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
      hours += 12;
    }

    return hours * 60 + minutes;
  };

  // Checks format AND range based on the selected slot
  const getTimeError = (timeStr, slotStr) => {
    if (!timeStr) return null; // Empty is handled by required check

    // 1. Basic Format Check
    if (!timeStr.includes(':')) return "Missing colon (:). Format: HH:MM AM/PM";
    if (!/[AaPp][Mm]/.test(timeStr)) return "Missing AM or PM.";

    const minutes = parseTimeToMinutes(timeStr);
    if (minutes === null) return "Invalid time format.";

    // 2. Range Check based on Slot
    if (slotStr) {
      const lowerSlot = slotStr.toLowerCase();

      // Morning (8am - 12pm) -> 480 to 720 mins
      if (lowerSlot.includes('morning')) {
        if (minutes < 480 || minutes > 720) return "Time must be between 8:00 AM and 12:00 PM.";
      }
      // Afternoon (12pm - 6pm) -> 720 to 1080 mins
      else if (lowerSlot.includes('afternoon')) {
        if (minutes < 720 || minutes > 1080) return "Time must be between 12:00 PM and 6:00 PM.";
      }
      // Evening (After 6pm) -> > 1080 mins
      else if (lowerSlot.includes('evening')) {
        if (minutes <= 1080) return "Time must be after 6:00 PM.";
      }
    }

    return null; // Valid
  };

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

    if (!isPhoneValid(phone)) {
      alert("Please enter a valid phone number format (e.g., 012-3456789).");
      return;
    }

    // Iterate through items to validate per-item fields
    for (const item of items) {
      if (!selectedPickupLocations[item.id]) {
        alert(`Please select a location for ${item.title}`);
        return;
      }
      if (!selectedDays[item.id]) {
        alert(`Please select a meetup day for ${item.title}`);
        return;
      }
      if (!selectedSlots[item.id]) {
        alert(`Please select a time slot (Morning/Afternoon/Evening) for ${item.title}`);
        return;
      }
      if (!selectedTimes[item.id]) {
        alert(`Please enter a specific meetup time for ${item.title}`);
        return;
      }

      // Time Range & Format Validation
      const timeError = getTimeError(selectedTimes[item.id], selectedSlots[item.id]);
      if (timeError) {
        alert(`Invalid time for ${item.title}: ${timeError}`);
        return;
      }
    }

    setProcessing(true);

    try {
      const orderPromises = items.map(async (cartItem) => {
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
          meetupTime: selectedTimes[cartItem.id], // Specific time
          meetupSlot: selectedSlots[cartItem.id], // Slot Category
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
          notificationForSeller: true, // Notify seller about new order
          notificationForBuyer: false,
          createdAt: serverTimestamp(),
          paidAt: serverTimestamp(),
        });

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

        await deleteDoc(doc(db, "carts", cartItem.id));
        return orderRef.id;
      });

      const orderIds = await Promise.all(orderPromises);

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

            {/* Order Items List */}
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

            {/* Contact Info Form */}
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
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent ${phone && !isPhoneValid(phone)
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-brand-purple'
                        }`}
                      placeholder="012-345-6789"
                      required
                    />
                  </div>
                  {phone && !isPhoneValid(phone) && (
                    <p className="text-red-500 text-xs mt-1">Invalid format. Try: 012-3456789</p>
                  )}
                </div>
              </div>
            </div>

            {/* Meetup Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule Meetups</h2>
              <div className="space-y-6">
                {items.map((item) => {
                  const availableLocations = item.sellerLocations || item.locations || (item.location ? [item.location] : []);
                  const dayOptions = getDayOptions(item.availabilityDays);
                  const timeSlots = item.availabilitySlots || ['Morning', 'Afternoon', 'Evening'];

                  return (
                    <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                          <p className="text-xs text-gray-500">Configure pickup details below</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                            {/* Slot Helper Dropdown (Bound to `selectedSlots`) */}
                            <select
                              className="w-1/3 p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#59287a] outline-none bg-white"
                              value={selectedSlots[item.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedSlots({ ...selectedSlots, [item.id]: val });
                              }}
                            >
                              <option value="">Slot...</option>
                              {timeSlots.map((slot, idx) => (
                                <option key={idx} value={slot.split(' ')[0]}>{slot}</option>
                              ))}
                            </select>

                            {/* TIME INPUT (Bound to `selectedTimes`) */}
                            <input
                              type="text"
                              placeholder="Specific Time (e.g. 6:30 PM)"
                              className={`flex-1 p-2.5 text-sm border rounded-lg focus:ring-2 outline-none ${selectedTimes[item.id] && getTimeError(selectedTimes[item.id], selectedSlots[item.id])
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-[#59287a]'
                                }`}
                              value={selectedTimes[item.id] || ''}
                              onChange={(e) => setSelectedTimes({ ...selectedTimes, [item.id]: e.target.value })}
                            />
                          </div>
                          {/* Dynamic Error Text */}
                          {selectedTimes[item.id] && getTimeError(selectedTimes[item.id], selectedSlots[item.id]) ? (
                            <p className="text-red-500 text-xs mt-1">{getTimeError(selectedTimes[item.id], selectedSlots[item.id])}</p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Select a slot, then type the specific time.</p>
                          )}
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

          {/* Right Column: Order Summary */}
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
                {processing ? <><Loader2 className="animate-spin" size={22} /> Processing...</> : <><Lock size={22} /> Confirm & Pay</>}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4 font-medium">Secure checkout powered by ReThrive</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;