import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, Gift } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ClaimDonation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/login'); return; }
      setUser(u);
      
      const docRef = doc(db, "donations", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() });
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

    setClaiming(true);
    try {
      const itemRef = doc(db, "donations", id);

      await updateDoc(itemRef, {
        receiverId: user.uid,
        claimedAt: serverTimestamp(),
      });

      alert("Successfully claimed item! Please contact the donor for pickup details.");
      navigate(`/donation/${id}`);
    } catch (error) {
      console.error("Error claiming item:", error);
      alert("Failed to claim item. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#9af71e]/5 flex items-center justify-center"><Loader2 className="animate-spin text-[#7db038]" size={48} /></div>;
  if (!item) return <div className="min-h-screen bg-[#9af71e]/5 flex items-center justify-center text-xl font-bold text-gray-500">Item not found.</div>;
  
  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-20 pt-6 px-4 flex flex-col items-center justify-center">
      <div className="flex gap-3 mt-24"></div>
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-[#7db038]/20 max-w-md w-full text-center">
        <div className="bg-[#7db038]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Gift size={40} className="text-[#7db038]" />
        </div>
        <h1 className="text-2xl font-black text-[#364f15] mb-2">Claim this Item?</h1>
        <p className="text-gray-600 mb-6">You are about to claim <strong>{item.title}</strong>.</p>
        
        <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left flex gap-4 items-center">
          <img src={item.image} className="w-16 h-16 rounded-lg object-cover" />
          <div>
            <p className="font-bold text-gray-900">{item.title}</p>
            <p className="text-sm text-gray-500">{item.location}</p>
          </div>
        </div>

        <button onClick={handleConfirmClaim} disabled={claiming} className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
          {claiming ? <><Loader2 className="animate-spin" /> Claiming...</> : 'Confirm Claim'}
        </button>
        <button onClick={() => navigate(-1)} disabled={claiming} className="w-full mt-3 text-gray-500 font-bold py-3 rounded-2xl hover:text-gray-700 transition-colors disabled:opacity-50">Cancel</button>
      </div>
    </div>
  );
};

export default ClaimDonation;