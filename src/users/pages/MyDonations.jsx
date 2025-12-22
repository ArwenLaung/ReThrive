import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Trash2, MapPin, Loader2 } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import ConfirmModal from '../../components/ConfirmModal';

const MyDonations = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { navigate('/login'); return; }

      const q = query(collection(db, "donations"), where("donorId", "==", currentUser.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const userItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        userItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setItems(userItems);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleDelete = (e, itemId) => {
    e.preventDefault(); // Prevent navigation when clicking delete
    e.stopPropagation();
    setDeleteTarget(itemId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "donations", deleteTarget));
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#7db038]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 pt-24 px-6">
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-black text-[#364f15]">My Donations</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="bg-white p-16 rounded-[2rem] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] max-w-2xl w-full">
              <div className="bg-[#f2f9e6] p-6 rounded-full mb-6">
                <Gift size={64} className="text-[#7db038]" />
              </div>
              <h2 className="text-2xl font-bold text-[#364f15] mb-2">No donations yet</h2>
              <p className="text-[#7db038]/70 max-w-sm mx-auto mb-8 leading-relaxed">
                You haven't donated any items yet. Your generosity can make a difference!
              </p>
              <Link to="/donateitem" className="bg-[#7db038] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#4a6b1d] transition-all shadow-lg hover:shadow-green-200 active:scale-95">
                Donate an Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <Link 
                key={item.id} 
                to={`/mydonationdetail/${item.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-sm hover:shadow-md transition-all relative block group"
              >
                <div className="relative aspect-square bg-gray-100">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />

                  <div className="absolute top-3 left-3">
                    {item.receiverId ? (
                       <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gray-500 shadow-sm">CLAIMED</span>
                    ) : (
                       <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#7db038] shadow-sm">ACTIVE</span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate mb-1 group-hover:text-[#7db038] transition-colors">{item.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} /> {item.location}</div>
                    <button 
                      onClick={(e) => handleDelete(e, item.id)} 
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete donation?"
        message="Are you sure you want to delete this donation listing?"
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MyDonations;