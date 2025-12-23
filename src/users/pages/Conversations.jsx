import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Conversations = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubBuyer = () => {};
    let unsubSeller = () => {};

    unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const uid = currentUser.uid;

      const buyerQ = query(
        collection(db, 'itemChats'),
        where('buyerId', '==', uid),
      );
      const sellerQ = query(
        collection(db, 'itemChats'),
        where('sellerId', '==', uid),
      );

      const buckets = {
        buyer: [],
        seller: [],
      };

      const recompute = () => {
        const merged = [...buckets.buyer, ...buckets.seller];
        merged.sort(
          (a, b) =>
            (b.lastMessageAt || 0) - (a.lastMessageAt || 0)
        );
        setConversations(merged);
        setLoading(false);
      };

      unsubBuyer = onSnapshot(buyerQ, (snap) => {
        buckets.buyer = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              role: 'buyer',
              itemId: data.itemId,
              itemTitle: data.itemTitle || 'Marketplace item',
              otherName: data.sellerName || 'Seller',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis
                ? data.lastMessageAt.toMillis()
                : 0,
            };
          })
          // Only keep conversations that have at least one message
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });

      unsubSeller = onSnapshot(sellerQ, (snap) => {
        buckets.seller = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              role: 'seller',
              itemId: data.itemId,
              itemTitle: data.itemTitle || 'Marketplace item',
              otherName: data.buyerName || 'Buyer',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis
                ? data.lastMessageAt.toMillis()
                : 0,
            };
          })
          // Only keep conversations that have at least one message
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });
    });

    return () => {
      unsubscribeAuth();
      unsubBuyer();
      unsubSeller();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin text-brand-purple" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 pt-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black text-brand-purple mb-6">
          Conversations
        </h1>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              You have no conversations yet. Start by contacting a seller or buyer.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  if (conv.role === 'buyer') {
                    navigate(`/chat-item/${conv.itemId}`);
                  } else {
                    navigate(`/chat-item/${conv.itemId}?chatId=${conv.id}`);
                  }
                }}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
                  <MessageCircle size={18} className="text-brand-purple" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {conv.itemTitle}
                    </p>
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      {conv.role === 'buyer' ? 'Seller' : 'Buyer'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {conv.otherName}
                  </p>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;


