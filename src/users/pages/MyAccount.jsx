import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Edit3, Package, ShoppingBag, Clock,
  Settings, Lock, LogOut, Plus, ChevronRight, Trophy, Gift, Heart, ShoppingCart, PackageCheck
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getCountFromServer, doc, getDoc, getDocs } from 'firebase/firestore';
import DefaultProfilePic from '../assets/default_profile_pic.jpg';

const MyAccount = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Student", email: "Loading...", avatar: DefaultProfilePic });
  
  // Stats state including the split for donations
  const [stats, setStats] = useState({ 
    activeListings: 0, 
    soldItems: 0, 
    points: 0, 
    activeDonations: 0, 
    completedDonations: 0, 
    cartItems: 0 
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { navigate('/login'); return; }
      try {
        setUser({
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email.split('@')[0],
          email: currentUser.email,
          avatar: currentUser.photoURL || DefaultProfilePic
        });

        // 1. Marketplace Stats (Active & Sold)
        const itemsRef = collection(db, "items");
        const activeSnap = await getCountFromServer(query(itemsRef, where("sellerId", "==", currentUser.uid), where("status", "==", "active")));
        const soldSnap = await getCountFromServer(query(itemsRef, where("sellerId", "==", currentUser.uid), where("status", "==", "sold")));
        
        // 2. Donation Stats (Active vs Completed)
        // We fetch ALL donations for the user first to ensure reliability, then filter in JS
        const donationQuery = query(collection(db, "donations"), where("donorId", "==", currentUser.uid));
        const donationSnapshot = await getDocs(donationQuery);
        
        const allDonations = donationSnapshot.docs.map(doc => doc.data());
        const completedCount = allDonations.filter(d => d.receiverId).length; // Items with a receiver
        const activeCount = allDonations.length - completedCount; // Total - Completed

        // 3. Cart Items
        const cartSnap = await getCountFromServer(query(collection(db, "carts"), where("userId", "==", currentUser.uid)));

        // 4. EcoPoints
        let currentPoints = 0;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) currentPoints = userDoc.data().ecoPoints || 0;
        } catch (e) {}

        setStats({
          activeListings: activeSnap.data().count,
          soldItems: soldSnap.data().count,
          points: currentPoints,
          activeDonations: activeCount,
          completedDonations: completedCount,
          cartItems: cartSnap.data().count
        });
      } catch (error) { console.error("Error fetching account data:", error); } 
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try { await signOut(auth); navigate('/login'); } catch (error) { alert("Error logging out: " + error.message); }
    }
  };

  const MenuRow = ({ icon: Icon, label, subLabel, onClick, isLast }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between py-4 group ${!isLast ? 'border-b border-[#59287a]/10' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
          <Icon size={20} className="text-[#59287a]" />
        </div>
        <div className="text-left">
          <p className="font-bold text-[#59287a] group-hover:text-purple-900 transition-colors">{label}</p>
          {subLabel && <p className="text-xs text-gray-500">{subLabel}</p>}
        </div>
      </div>
      <ChevronRight size={18} className="text-[#59287a]/40 group-hover:text-[#59287a] transition-colors" />
    </button>
  );

  return (
    <div className="min-h-screen bg-white pb-32 pt-20 px-6">
      <div className="max-w-xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#59287a]">My Account</h1>
        <button className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-[#59287a] transition-colors"><Settings size={22} /></button>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm flex items-center gap-5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#59287a]/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <img src={user?.avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm z-10 bg-gray-200" />
          <div className="flex-1 z-10">
            <h2 className="text-xl font-bold text-[#59287a]">{user?.name}</h2>
            <p className="text-gray-600 text-sm mb-3">{user?.email}</p>
            <button onClick={() => navigate('/editprofile')} className="flex items-center gap-2 text-xs font-bold bg-white text-[#59287a] px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95">
              <Edit3 size={14} /> Edit Profile
            </button>
          </div>
        </div>

        {/* 1. REWARDS */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Rewards</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow icon={Trophy} label="Missions and Rewards" subLabel={`${stats.points} EcoPoints available`} isLast={true} onClick={() => navigate('/myrewards')} />
          </div>
        </div>

        {/* 2. MARKETPLACE */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Marketplace</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow icon={ShoppingCart} label="My Cart" subLabel={`${stats.cartItems} Items in cart`} onClick={() => navigate('/mycart')} />
            
            <MenuRow icon={Package} label="My Listings" subLabel={`${stats.activeListings} Active Items`} onClick={() => navigate('/mylistings')} />
            <MenuRow icon={ShoppingBag} label="My Sold Items" subLabel={`${stats.soldItems} Items Sold`} onClick={() => navigate('/solditems')} />
            <MenuRow icon={Clock} label="Purchase History" subLabel="View past orders" isLast={true} onClick={() => navigate('/purchasehistory')} />
          </div>
        </div>

        {/* 3. DONATIONS - UPDATED SECTION */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Donations</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            
            {/* Active Donations */}
            <MenuRow icon={Gift} label="My Donations" subLabel={`${stats.activeDonations} Active Donations`} onClick={() => navigate('/mydonations')} />
            
            {/* My Donated Items */}
            <MenuRow icon={PackageCheck} label="My Donated Items" subLabel={`${stats.completedDonations} Items given away`} onClick={() => navigate('/mydonateditems')} />
            
            {/* Claimed Items */}
            <MenuRow icon={Heart} label="My Claimed Items" subLabel="Items received from community" isLast={true} onClick={() => navigate('/myclaimeditems')} />
          </div>
        </div>

        {/* 4. SETTINGS */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Settings</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow icon={User} label="Account Details" onClick={() => navigate('/accountdetails')} />
            <MenuRow icon={Lock} label="Change Password" isLast={true} onClick={() => alert("Change password feature coming soon!")} />
          </div>
        </div>

        {/* 5. LOG OUT */}
        <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
          <LogOut size={20} /> Log Out
        </button>
      </div>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <button onClick={() => navigate('/sellitem')} className="bg-[#59287a] hover:bg-[#451d5e] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95 ring-2 ring-white">
          <Plus size={20} /> Sell Item
        </button>
        <button onClick={() => navigate('/donateitem')} className="bg-[#7db038] hover:bg-[#4a6b1d] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95 ring-2 ring-white">
          <Gift size={20} /> Donate Item
        </button>
      </div>
    </div>
  );
};

export default MyAccount;