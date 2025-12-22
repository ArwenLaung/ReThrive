import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PackageCheck, MapPin, Loader2, Gift, Heart } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const MyDonatedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const q = query(
        collection(db, "donations"),
        where("donorId", "==", currentUser.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const allDonations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter: Only keep items that have been claimed (have a receiverId)
        const donatedItems = allDonations.filter(item => item.receiverId);
        
        // Sort by newest first
        donatedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setItems(donatedItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching donated items:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#7db038]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-[#364f15] tracking-tight">My Donated Items</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-[#7db038]/10 p-6 rounded-full mb-6">
                <Gift className="text-[#7db038]" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No items given away yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Items you donate that get claimed by the community will appear here.
              </p>
              <Link to="/donateitem" className="bg-[#7db038] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#4a6b1d] transition-all shadow-lg hover:shadow-green-200 active:scale-95">
                Donate an Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group relative opacity-90">
                
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover grayscale-[0.3]"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gray-600 shadow-sm">
                      CLAIMED
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin size={12} /> {item.location}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 border-t border-gray-50 pt-3">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Status</p>
                      <p className="text-[#7db038] font-black text-lg flex items-center gap-1">
                        <Heart size={16} fill="#7db038" /> Given
                      </p>
                    </div>
                    <Link to={`/donation/${item.id}`} className="text-xs font-bold text-gray-400 hover:text-[#7db038]">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonatedItems;