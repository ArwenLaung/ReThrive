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
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  
  // Time State
  const [selectedTime, setSelectedTime] = useState(''); // Text input value (e.g. "9:00 AM")
  const [selectedSlot, setSelectedSlot] = useState(''); // Dropdown value (e.g. "Morning (8am-12pm)")

  const [ecoPoints, setEcoPoints] = useState(0);
  const [lastDonationClaimAt, setLastDonationClaimAt] = useState(null);

  const CLAIM_COST = 10; 

  // --- VALIDATION HELPERS ---
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
  // --------------------------

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
    if (slots && slots.length > 0) return slots;
    return ['Morning (8am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (After 6pm)'];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/login'); return; }
      setUser(u);
      setName(u.displayName || '');
      setEmail(u.email || '');
      
      try {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setEcoPoints(data.ecoPoints || 0);
          setLastDonationClaimAt(data.lastDonationClaimAt || null);
        }
      } catch (e) {
        console.error('Error loading user data:', e);
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

    if (!isPhoneValid(phone)) {
        alert("Please enter a valid phone number format (e.g., 012-3456789).");
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

    if (!selectedSlot) {
        alert('Please select a time slot (Morning/Afternoon/Evening).');
        return;
    }

    if (!selectedTime.trim()) {
      alert('Please enter a specific meetup time.');
      return;
    }

    // Comprehensive Time Validation
    const timeError = getTimeError(selectedTime, selectedSlot);
    if (timeError) {
        alert(`Invalid time: ${timeError}`);
        return;
    }

    if (ecoPoints < CLAIM_COST) {
      alert('You do not have enough EcoPoints to claim this item.');
      return;
    }

    // Weekly Limit Check
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
      console.error('Error checking claim limit:', e);
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
        meetupTime: selectedTime.trim(), // We save the specific time typed
        meetupSlot: selectedSlot,        // Optional: save the slot category too if needed
        claimedAt: serverTimestamp(),
        notificationForDonor: true, // Notify donor that item was claimed
      });

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
        setEcoPoints((prev) => Math.max(0, (prev || 0) - CLAIM_COST));
      } catch (e) {
        console.error('Error updating user points:', e);
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

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"><Loader2 className="animate-spin text-[#7db038]" size={48} /></div>;
  if (!item) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-xl font-bold text-gray-500">Item not found.</div>;
  
  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex flex-col gap-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7db038] transition-colors w-fit">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-3xl font-black text-[#364f15] tracking-tight">Claim Donation</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-[#7db038]/10 w-14 h-14 rounded-full flex items-center justify-center">
              <Gift size={32} className="text-[#7db038]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#364f15]">Claim this Item</h1>
              <p className="text-gray-600 text-sm">You are about to claim <strong>{item.title}</strong>.</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl mb-4 flex gap-4 items-center">
            <img src={item.image} className="w-16 h-16 rounded-lg object-cover" alt={item.title} />
            <div>
              <p className="font-bold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-500">{item.location || (item.locations && item.locations[0])}</p>
            </div>
          </div>

          {/* EcoPoints info */}
          <div className="bg-[#f2f9e6] border border-[#7db038]/30 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#364f15]">Claim cost: {CLAIM_COST} EcoPoints</p>
              <p className="text-xs text-[#567027]">You currently have {ecoPoints} EcoPoints.</p>
            </div>
            {ecoPoints < CLAIM_COST && <span className="text-xs font-semibold text-red-600">Not enough points</span>}
          </div>

          {/* Contact Info */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#364f15]">Your Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none text-sm" placeholder="Your full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none text-sm" placeholder="your.email@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 outline-none text-sm ${
                        phone && !isPhoneValid(phone) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#7db038]'
                    }`} 
                    placeholder="012-345-6789" 
                  />
                </div>
                {phone && !isPhoneValid(phone) && <p className="text-red-500 text-xs mt-1">Invalid phone format.</p>}
              </div>
            </div>
          </div>

          {/* Meetup config */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#364f15]">Meetup Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                  <MapPin size={14} /> Location *
                </label>
                <select className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                  <option value="">Select location...</option>
                  {(item.locations || (item.location ? [item.location] : [])).map((loc, idx) => (
                    <option key={idx} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                  <CalendarDays size={14} /> Day *
                </label>
                <select className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                  <option value="">Select day...</option>
                  {getDayOptions(item.availabilityDays).map((day, idx) => (
                    <option key={idx} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-600 uppercase mb-1">
                <Clock size={14} /> Preferred Time *
              </label>
              <div className="flex gap-3">
                {/* SLOT DROPDOWN: 
                   - We bind this to `selectedSlot`.
                   - We REMOVED the logic that auto-types into `selectedTime`.
                   - It only sets the 'context' for validation now.
                */}
                <select
                  className="w-1/3 p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] outline-none bg-white"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  <option value="">Slot...</option>
                  {getTimeSlots(item.availabilitySlots).map((slot, idx) => (
                    <option key={idx} value={slot.split(' ')[0]}>{slot}</option>
                  ))}
                </select>
                
                {/* TIME INPUT: Turns red if time is invalid OR doesn't match slot */}
                <input
                  type="text"
                  className={`flex-1 p-2.5 text-sm border rounded-xl focus:ring-2 outline-none ${
                    selectedTime && getTimeError(selectedTime, selectedSlot)
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#7db038]'
                  }`}
                  placeholder="Specific Time (e.g. 9:00 AM)"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
              {/* Dynamic Error Message */}
              {selectedTime && getTimeError(selectedTime, selectedSlot) ? (
                  <p className="text-red-500 text-xs mt-1">{getTimeError(selectedTime, selectedSlot)}</p>
              ) : (
                  <p className="text-xs text-gray-400 mt-1">Select a slot to see range, then type specific time.</p>
              )}
            </div>
          </div>

          <button onClick={handleConfirmClaim} disabled={claiming || ecoPoints < CLAIM_COST} className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
            {claiming ? <><Loader2 className="animate-spin" /> Claiming...</> : <><CheckCircle size={20} /> Confirm Claim</>}
          </button>
          <button onClick={() => navigate(-1)} disabled={claiming} className="w-full mt-3 text-gray-500 font-bold py-3 rounded-2xl hover:text-gray-700 transition-colors disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ClaimDonation;