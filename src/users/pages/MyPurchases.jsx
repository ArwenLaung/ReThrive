import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, MapPin } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const MyPurchases = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Query for items bought by this user
      const q = query(
        collection(db, "items"),
        where("buyerId", "==", currentUser.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const purchasedItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setItems(purchasedItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching purchases:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Purchases</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full mt-10">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-[#f3eefc] p-6 rounded-full mb-6">
                <ShoppingBag size={64} className="text-[#59287a]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No purchases yet</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                Items you buy will appear here. Start browsing to find great deals!
              </p>
              <Link to="/marketplace" className="bg-brand-purple text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95">
                Browse Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                
                <div className="relative aspect-square bg-gray-100 opacity-90">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover grayscale-[0.2]"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-green-600 shadow-sm">
                      PURCHASED
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin size={12} /> {item.location}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[#59287a] font-black text-lg">RM {item.price}</p>
                    <Link to={`/item/${item.id}`} className="text-xs font-bold text-gray-400 hover:text-[#59287a]">
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

export default MyPurchases;