import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Loader2, MapPin } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const MyClaimedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { navigate('/login'); return; }
      const q = query(collection(db, "donations"), where("receiverId", "==", currentUser.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const claimed = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(claimed);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#7db038]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-20 pt-6 px-4">
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
        <Link to="/myaccount" className="p-2 bg-white rounded-full hover:bg-gray-100 text-[#364f15] transition-colors shadow-sm"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-extrabold text-[#364f15]">My Claimed Items</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-[#7db038]/20">
            <div className="bg-[#7db038]/10 p-6 rounded-full mb-4"><Gift size={48} className="text-[#7db038]" /></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No claimed items</h2>
            <Link to="/donationcorner" className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#4a6b1d] transition-colors">Browse Donations</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-sm hover:shadow-md transition-all relative">
                <div className="relative aspect-square bg-gray-100 opacity-90">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover grayscale-[0.2]" />
                  <div className="absolute top-3 left-3"><span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-green-600 shadow-sm">CLAIMED</span></div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin size={12} /> {item.location}</div>
                  <Link to={`/donation/${item.id}`} className="text-xs font-bold text-gray-400 hover:text-[#7db038]">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClaimedItems;