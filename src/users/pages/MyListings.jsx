import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Trash2, MapPin, Loader2, MessageCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MyListings = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Check Auth & Fetch Data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);

      // Real-time Listener for User's Items
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

  // Delete Item Handler
  const handleDelete = async (itemId) => {
    setDeleteTarget(itemId);
  };

  const handleViewMessages = (itemId) => {
    navigate(`/chat-item/${itemId}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "items", deleteTarget));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item.");
    } finally {
      setDeleteTarget(null);
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
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-brand-purple tracking-tight">My Listings</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-purple-50 p-6 rounded-full mb-6">
                <Package className="text-brand-purple" size={64} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">No listings yet</h2>
              <p className="text-gray-500 mb-6">You haven't posted any items for sale.</p>
              <Link to="/sellitem" className="bg-brand-purple text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-800 transition-all shadow-lg hover:shadow-purple-200 active:scale-95">
                Sell an Item
              </Link>
            </div>
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
                  
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <p className="text-[#59287a] font-black text-lg">RM {item.price}</p>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="relative z-20 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Chat with buyer button (full width, above overlay link) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleViewMessages(item.id);
                    }}
                    className="relative z-20 mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 w-full bg-brand-purple text-white rounded-xl text-xs font-semibold hover:bg-purple-800 transition-all active:scale-95"
                    title="Chat with buyer"
                  >
                    <MessageCircle size={14} />
                    <span>Chat with buyer</span>
                  </button>
                </div>

                <Link to={`/listing/${item.id}`} className="absolute inset-0 z-10" />
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete listing?"
        message="Are you sure you want to delete this listing? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MyListings;