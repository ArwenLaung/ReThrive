import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Trash2, MapPin, Loader2, AlertCircle } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

const MyListings = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 1. Check Auth & Fetch Data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // 2. Real-time Listener for User's Items
      const q = query(
        collection(db, "items"),
        where("sellerId", "==", currentUser.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const userItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Client-side sort by date (newest first)
        userItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setItems(userItems);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching listings:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // 3. Delete Item Handler
  const handleDelete = async (itemId) => {
    if (window.confirm("Are you sure you want to delete this listing? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "items", itemId));
        // UI updates automatically due to onSnapshot listener
      } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6 px-4">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
        <Link to="/myaccount" className="p-2 bg-white rounded-full hover:bg-gray-100 text-[#59287a] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-extrabold text-[#59287a]">My Listings</h1>
      </div>

      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="bg-[#f3eefc] p-6 rounded-full mb-4">
              <Package size={48} className="text-[#59287a]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No listings yet</h2>
            <p className="text-gray-500 mb-6">You haven't posted any items for sale.</p>
            <Link to="/sellitem" className="bg-[#59287a] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#451d5e] transition-colors">
              Sell an Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${item.status === 'sold' ? 'bg-gray-500' : 'bg-green-500'}`}>
                      {item.status === 'sold' ? 'SOLD' : 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin size={12} /> {item.location}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[#59287a] font-black text-lg">RM {item.price}</p>
                    
                    {/* Delete Button */}
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Click to View Overlay */}
                <Link to={`/listing/${item.id}`} className="absolute inset-0 z-0" />
                {/* Ensure delete button is clickable above the link */}
                <div className="absolute bottom-4 right-4 z-10 pointer-events-none"></div> 
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;