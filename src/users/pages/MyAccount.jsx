import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Edit3, Package, ShoppingBag, Clock,
  Gift, Settings, Lock, LogOut, Plus, ChevronRight, Loader2, Trophy
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';

const MyAccount = () => {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
    activeListings: 0,
    soldItems: 0,
  });

  // --- 1. FETCH DATA ON LOAD ---
  useEffect(() => {
    /* const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Redirect if not logged in
        navigate('/login'); 
        return;
      }

      // A. Set Basic Auth Info
      const userData = {
        uid: currentUser.uid,
        name: currentUser.displayName || "USM Student",
        email: currentUser.email,
        avatar: currentUser.photoURL || "https://i.pravatar.cc/150?img=32" // Fallback avatar
      };
      setUser(userData);

      try {
        // B. Fetch Listing Counts (Active vs Sold)
        // assuming your items have 'uid' for the seller and 'status' fields
        const itemsRef = collection(db, "items");
        
        // Count Active Listings
        const activeQuery = query(
          itemsRef, 
          where("uid", "==", currentUser.uid),
          where("status", "!=", "sold") // Count everything not sold
        );
        const activeSnapshot = await getCountFromServer(activeQuery);

        // Count Sold Items
        const soldQuery = query(
          itemsRef, 
          where("uid", "==", currentUser.uid),
          where("status", "==", "sold")
        );
        const soldSnapshot = await getCountFromServer(soldQuery);

        // C. Fetch Extra User Details (Points/Vouchers)
        // assuming you have a 'users' collection with this info
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let extraData = { points: 0, vouchers: 0 };

        if (userDocSnap.exists()) {
          extraData = userDocSnap.data();
        }

        // D. Update State
        setStats({
          activeListings: activeSnapshot.data().count,
          soldItems: soldSnapshot.data().count,
          points: extraData.points || 120,    // Default to 120 if field missing
          vouchers: extraData.vouchers || 2   // Default to 2 if field missing
        });

      } catch (error) {
        console.error("Error fetching account data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
    */

    // Mock data to display ui first
    const loadFakeData = () => {
      // simulate network delay
      setTimeout(() => {
        setUser({
          uid: "12345",
          name: "Cindy Lim", // Matching your screenshot name
          email: "cindy@student.usm.my",
          avatar: "https://i.pravatar.cc/150?img=5" // Use a nice image
        });

        setStats({
          activeListings: 3,
          soldItems: 12
        });

        setLoading(false);
      }, 800); // 0.8 second loading time
    };

    loadFakeData();
  }, [navigate]);

  // --- 2. LOGOUT LOGIC ---
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        navigate('/login');
      } catch (error) {
        alert("Error logging out: " + error.message);
      }
    }
  };

  // --- COMPONENT: List Item Row ---
  const MenuRow = ({ icon: Icon, label, subLabel, onClick, isLast }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-4 group ${!isLast ? 'border-b border-[#59287a]/10' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon with soft purple background */}
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

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#59287a]" size={40} />
          <p className="text-[#59287a] font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 pt-20 px-6">

      {/* --- PAGE TITLE --- */}
      <div className="max-w-xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#59287a]">My Account</h1>
        <button className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-[#59287a] transition-colors">
          <Settings size={22} />
        </button>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        {/* --- 1. PROFILE CARD (Butter Yellow) --- */}
        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm flex items-center gap-5 relative overflow-hidden group">
          {/* Decorative background circle */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#59287a]/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>

          <img
            src={user?.avatar}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm z-10 bg-gray-200"
          />
          <div className="flex-1 z-10">
            <h2 className="text-xl font-bold text-[#59287a]">{user?.name}</h2>
            <p className="text-gray-600 text-sm mb-3">{user?.email}</p>
            <button
              onClick={() => navigate('/editprofile')} 
              className="flex items-center gap-2 text-xs font-bold bg-white text-[#59287a] px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          </div>
        </div>

        {/* --- 2. BUYING & SELLING SECTION --- */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Marketplace</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow
              icon={Package}
              label="My Listings"
              subLabel={`${stats.activeListings} Active Items`}
              onClick={() => navigate('/mylistings')}
            />
            <MenuRow
              icon={ShoppingBag}
              label="My Sold Items"
              subLabel={`${stats.soldItems} Items Sold`}
              onClick={() => navigate('/solditems')}
            />
            <MenuRow
              icon={Clock}
              label="Purchase History"
              isLast={true}
              onClick={() => navigate('/purchasehistory')}
            />
          </div>
        </div>

        {/* --- 3. REWARDS SECTION --- */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Rewards</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow
              icon={Trophy}
              label="Missions and Rewards"
              subLabel="Check points, redeem vouchers & more"
              isLast={true}
              onClick={() => navigate('/myrewards')}
            />
          </div>
        </div>

        {/* --- 4. ACCOUNT SETTINGS --- */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Settings</h3>
          <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <MenuRow
              icon={User}
              label="Account Details"
              onClick={() => navigate('/accountdetails')}
            />
            <MenuRow
              icon={Lock}
              label="Change Password"
              isLast={true}
              onClick={() => console.log("Password")}
            />
          </div>
        </div>

        {/* --- 5. LOG OUT --- */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} /> Log Out
        </button>

      </div>

      {/* --- 6. FLOATING ACTION BUTTON --- */}
      <button
        onClick={() => navigate('/sellitem')}
        className="fixed bottom-6 right-6 bg-[#59287a] hover:bg-[#451d5e] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95 z-50 ring-4 ring-white"
      >
        <Plus size={24} />
        Sell Item
      </button>

    </div>
  );
};

export default MyAccount;