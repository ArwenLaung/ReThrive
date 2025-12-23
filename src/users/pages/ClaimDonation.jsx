import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, Gift, MapPin, CalendarDays, Clock, User, Mail, Phone } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ClaimDonation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [ecoPoints, setEcoPoints] = useState(0);
  const [lastDonationClaimAt, setLastDonationClaimAt] = useState(null);

  const CLAIM_COST = 10; // EcoPoints required to claim a donation

  const getDayOptions = (sellerDays) => {
    if (!sellerDays || sellerDays.length === 0) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }
    const options = new Set();
    sellerDays.forEach((type) => {
      if (type.includes('Weekdays')) {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach((d) => options.add(d));
      } else if (type.includes('Weekends')) {
        ['Saturday', 'Sunday'].forEach((d) => options.add(d));
      } else {
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach((d) => options.add(d));
      }
    });
    return Array.from(options);
  };

  const getTimeSlots = (slots) => {
    if (slots && slots.length > 0) {
      return slots;
    }
    return ['Morning (8am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (After 6pm)'];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/login'); return; }
      setUser(u);
      setName(u.displayName || '');
      setEmail(u.email || '');
      
      // Fetch user ecoPoints and last donation claim timestamp
      try {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setEcoPoints(data.ecoPoints || 0);
          setLastDonationClaimAt(data.lastDonationClaimAt || null);
        }
      } catch (e) {
        console.error('Error loading user ecoPoints for claim:', e);
      }
      
      const docRef = doc(db, "donations", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setItem({ id: snap.id, ...data });

        const availableLocations = data.locations || (data.location ? [data.location] : []);
        if (availableLocations.length > 0) {
          setSelectedLocation(availableLocations[0]);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  const handleConfirmClaim = async () => {
    if (!user || !item || claiming) return;

    if (item.donorId === user.uid) {
      alert("You cannot claim the donation you posted.");
      return;
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in your name, email and phone.');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a meetup location.');
      return;
    }

    if (!selectedDay) {
      alert('Please select a meetup day.');
      return;
    }

    if (!selectedTime.trim()) {
      alert('Please enter a preferred meetup time.');
      return;
    }

    // Ensure user has enough EcoPoints (guard on top of disabled button)
    if (ecoPoints < CLAIM_COST) {
      alert('You do not have enough EcoPoints to claim this item.');
      return;
    }

    // Enforce 1-claim-per-week using timestamp on user doc instead of query index
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.exists() ? userSnap.data() : {};
      const lastClaim = data.lastDonationClaimAt;
      if (lastClaim && lastClaim.toMillis) {
        const lastMs = lastClaim.toMillis();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastMs < weekMs) {
          alert('You can only claim one donation item every 7 days.');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking previous donation claim time:', e);
      // If this check fails, we still allow claiming to avoid blocking the user
    }

    setClaiming(true);
    try {
      const itemRef = doc(db, "donations", id);

      await updateDoc(itemRef, {
        receiverId: user.uid,
        receiverName: name.trim(),
        receiverEmail: email.trim(),
        receiverPhone: phone.trim(),
        meetupLocation: selectedLocation,
        meetupDay: selectedDay,
        meetupTime: selectedTime.trim(),
        claimedAt: serverTimestamp(),
      });

      // Deduct EcoPoints and record the claim time on the user document
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            ecoPoints: Math.max(0, (ecoPoints || 0) - CLAIM_COST),
            lastDonationClaimAt: serverTimestamp(),
          },
          { merge: true }
        );
        // Update local state so the UI reflects the new balance until navigation
        setEcoPoints((prev) => Math.max(0, (prev || 0) - CLAIM_COST));
      } catch (e) {
        console.error('Error updating lastDonationClaimAt on user:', e);
      }

      alert(`Congratulations! You have successfully claimed "${item.title}".`);
      navigate('/myclaimeditems');
    } catch (error) {
      console.error("Error claiming item:", error);
      alert("Failed to claim item. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#7db038]" size={48} />
      </div>
    );
  if (!item)
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-xl font-bold text-gray-500">
        Item not found.
      </div>
    );
  
  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7db038] transition-colors w-fit"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-3xl font-black text-[#364f15] tracking-tight">
          Claim Donation
        </h1>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-[#7db038]/10 w-14 h-14 rounded-full flex items-center justify-center">
              <Gift size={32} className="text-[#7db038]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#364f15]">
                Claim this Item
              </h1>
              <p className="text-gray-600 text-sm">
                You are about to claim <strong>{item.title}</strong>. Please
                confirm your contact and meetup details.
              </p>
            </div>
        </div>

          <div className="bg-gray-50 p-4 rounded-xl mb-4 flex gap-4 items-center">
            <img
              src={item.image}
              className="w-16 h-16 rounded-lg object-cover"
              alt={item.title}
            />
          <div>
            <p className="font-bold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-500">
                {item.location || (item.locations && item.locations[0])}
              </p>
            </div>
          </div>

          {/* EcoPoints info */}
          <div className="bg-[#f2f9e6] border border-[#7db038]/30 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#364f15]">
                Claim cost: {CLAIM_COST} EcoPoints
              </p>
              <p className="text-xs text-[#567027]">
                You currently have {ecoPoints} EcoPoints.
              </p>
            </div>
            {ecoPoints < CLAIM_COST && (
              <span className="text-xs font-semibold text-red-600">
                Not enough points
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#364f15]">Your Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] focus:border-transparent text-sm"
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] focus:border-transparent text-sm"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] focus:border-transparent text-sm"
                    placeholder="012-345-6789"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Meetup config */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#364f15]">
              Meetup Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                  <MapPin size={14} /> Location *
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="">Select location...</option>
                  {(item.locations && item.locations.length > 0
                    ? item.locations
                    : item.location
                    ? [item.location]
                    : []
                  ).map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                  <CalendarDays size={14} /> Day *
                </label>
                <select
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  <option value="">Select day...</option>
                  {getDayOptions(item.availabilityDays).map((day, idx) => (
                    <option key={idx} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                <Clock size={14} /> Preferred Time *
              </label>
              <div className="flex gap-3">
                {/* Slot helper dropdown, similar to checkout */}
                <select
                  className="w-1/3 p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSelectedTime(val + ': ');
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Slot...</option>
                  {getTimeSlots(item.availabilitySlots).map((slot, idx) => (
                    <option key={idx} value={slot.split(' ')[0]}>
                      {slot}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="flex-1 p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none"
                  placeholder="Specific Time (e.g. 6:30 PM)"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Choose a slot to autofill, then specify the exact time.
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmClaim}
            disabled={claiming || ecoPoints < CLAIM_COST}
            className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {claiming ? (
              <>
                <Loader2 className="animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Confirm Claim
              </>
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            disabled={claiming}
            className="w-full mt-3 text-gray-500 font-bold py-3 rounded-2xl hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimDonation;