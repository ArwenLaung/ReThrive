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
import ConfirmModal from '../../components/ConfirmModal';

const MyAccount = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Student", email: "Loading...", avatar: DefaultProfilePic });

  // Stats state
  const [stats, setStats] = useState({
    myListingsCount: 0,
    soldItemsCount: 0,
    purchasesCount: 0,
    myDonationsCount: 0,
    donatedHistoryCount: 0,
    claimedItemsCount: 0,
    cartItems: 0,
    points: 0
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

        // 1. MARKETPLACE STATS

        // A. My Listings: Count "active" and "pending"
        const itemsRef = collection(db, "items");
        const listingsSnap = await getCountFromServer(
          query(itemsRef, where("sellerId", "==", currentUser.uid), where("status", "in", ["active", "pending"]))
        );

        // B. My Sold Items: Count "sold"
        const soldSnap = await getCountFromServer(
          query(itemsRef, where("sellerId", "==", currentUser.uid), where("status", "==", "sold"))
        );

        // C. My Purchases: Count ORDERS where buyer is user and status is "completed"
        const ordersRef = collection(db, "orders");
        const purchasesSnap = await getCountFromServer(
          query(ordersRef, where("buyerId", "==", currentUser.uid), where("status", "==", "completed"))
        );

        // 2. DONATION STATS

        // Fetch all donations where user is DONOR to split them into Active/History
        const donationsRef = collection(db, "donations");
        const donorQuery = query(donationsRef, where("donorId", "==", currentUser.uid));
        const donorSnapshot = await getDocs(donorQuery);
        const donorDocs = donorSnapshot.docs.map(doc => doc.data());

        // D. My Donations (Active and Pending): Status is NOT 'completed'
        const myDonationsCount = donorDocs.filter(d => d.status !== 'completed').length;

        // E. My Donated Items (History): Status IS 'completed'
        const donatedHistoryCount = donorDocs.filter(d => d.status === 'completed').length;

        // F. My Claimed Items: User is RECEIVER (Count all pending and completed)
        const claimedSnap = await getCountFromServer(
          query(donationsRef, where("receiverId", "==", currentUser.uid))
        );

        // Cart Items
        const cartSnap = await getCountFromServer(query(collection(db, "carts"), where("userId", "==", currentUser.uid)));

        // EcoPoints
        let currentPoints = 0;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) currentPoints = userDoc.data().ecoPoints || 0;
        } catch (e) { }

        // SET STATE
        setStats({
          myListingsCount: listingsSnap.data().count,
          soldItemsCount: soldSnap.data().count,
          purchasesCount: purchasesSnap.data().count,
          myDonationsCount: myDonationsCount,
          donatedHistoryCount: donatedHistoryCount,
          claimedItemsCount: claimedSnap.data().count,
          cartItems: cartSnap.data().count,
          points: currentPoints
        });

      } catch (error) { console.error("Error fetching account data:", error); }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      alert("Error logging out: " + error.message);
    } finally {
      setShowLogoutConfirm(false);
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
            {/* Cart */}
            <MenuRow icon={ShoppingCart} label="My Cart" subLabel={`${stats.cartItems} Items in cart`} onClick={() => navigate('/mycart')} />

            {/* My Listings (Active + Pending) */}
            <MenuRow icon={Package} label="My Listings" subLabel={`${stats.myListingsCount} Active Items`} onClick={() => navigate('/mylistings')} />

            {/* My Sold Items (Sold) */}
            <MenuRow icon={ShoppingBag} label="My Sold Items" subLabel={`${stats.soldItemsCount} Items Sold`} onClick={() => navigate('/solditems')} />

            {/* My Purchases (Completed Orders) */}
            <MenuRow icon={Clock} label="My Purchases" subLabel={`${stats.purchasesCount} Completed Orders`} isLast={true} onClick={() => navigate('/mypurchases')} />
          </div>
        </div>

        {/* 3. DONATIONS */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Donations</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">

            {/* My Donations (Active + Pending) */}
            <MenuRow icon={Gift} label="My Donations" subLabel={`${stats.myDonationsCount} Active Donations`} onClick={() => navigate('/mydonations')} />

            {/* My Donated Items (Completed) */}
            <MenuRow icon={PackageCheck} label="My Donated Items" subLabel={`${stats.donatedHistoryCount} Items given away`} onClick={() => navigate('/mydonateditems')} />

            {/* Claimed Items (Pending + Completed) */}
            <MenuRow icon={Heart} label="My Claimed Items" subLabel={`${stats.claimedItemsCount} Items received from community`} isLast={true} onClick={() => navigate('/myclaimeditems')} />
          </div>
        </div>

        {/* 4. SETTINGS */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Settings</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow icon={User} label="Account Details" onClick={() => navigate('/accountdetails')} />
            <MenuRow icon={Lock} label="Change Password" isLast={true} onClick={() => navigate('/changepassword')} />
          </div>
        </div>

        {/* 5. LOG OUT */}
        <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
          <LogOut size={20} /> Log Out
        </button>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirmText="Log out"
        cancelText="Cancel"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />

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