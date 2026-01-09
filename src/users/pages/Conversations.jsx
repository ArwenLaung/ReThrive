import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, Gift } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';

const Conversations = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAuth = () => { };
    // Marketplace Unsubscribers
    let unsubBuyer = () => { };
    let unsubSeller = () => { };
    // Donation Unsubscribers
    let unsubDonor = () => { };
    let unsubReceiver = () => { };

    unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const uid = currentUser.uid;

      // 1. Marketplace Queries
      const buyerQ = query(
        collection(db, 'itemChats'),
        where('buyerId', '==', uid),
      );
      const sellerQ = query(
        collection(db, 'itemChats'),
        where('sellerId', '==', uid),
      );

      // 2. Donation Queries 
      const donationDonorQ = query(
        collectionGroup(db, 'threads'),
        where('donorId', '==', uid)
      );
      const donationReceiverQ = query(
        collectionGroup(db, 'threads'),
        where('receiverId', '==', uid)
      );

      const buckets = {
        buyer: [],
        seller: [],
        donor: [],
        receiver: []
      };

      const recompute = () => {
        const merged = [
          ...buckets.buyer,
          ...buckets.seller,
          ...buckets.donor,
          ...buckets.receiver
        ];
        // Sort by newest message first
        merged.sort(
          (a, b) =>
            (b.lastMessageAt || 0) - (a.lastMessageAt || 0)
        );
        setConversations(merged);
        setLoading(false);
      };

      // LISTENERS

      // A. Marketplace Buyer
      unsubBuyer = onSnapshot(buyerQ, (snap) => {
        buckets.buyer = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'marketplace',
              role: 'buyer',
              itemId: data.itemId,
              itemTitle: data.itemTitle || 'Marketplace item',
              otherName: data.sellerName || 'Seller',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
            };
          })
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });

      // B. Marketplace Seller
      unsubSeller = onSnapshot(sellerQ, (snap) => {
        buckets.seller = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'marketplace',
              role: 'seller',
              itemId: data.itemId,
              itemTitle: data.itemTitle || 'Marketplace item',
              otherName: data.buyerName || 'Buyer',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
            };
          })
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });

      // C. Donation Donor
      unsubDonor = onSnapshot(donationDonorQ, (snap) => {
        buckets.donor = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'donation',
              role: 'donor',
              routeId: data.donationId, // ID needed for navigation
              itemTitle: data.donationTitle || 'Donation Item',
              otherName: data.receiverName || 'Receiver',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
            };
          })
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });

      // D. Donation Receiver
      unsubReceiver = onSnapshot(donationReceiverQ, (snap) => {
        buckets.receiver = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: 'donation',
              role: 'receiver',
              routeId: data.donationId, // ID needed for navigation
              itemTitle: data.donationTitle || 'Donation Item',
              otherName: data.donorName || 'Donor',
              lastMessage: data.lastMessage || '',
              lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : 0,
            };
          })
          .filter((c) => c.lastMessage && c.lastMessage !== '');
        recompute();
      });
    });

    return () => {
      unsubscribeAuth();
      unsubBuyer();
      unsubSeller();
      unsubDonor();
      unsubReceiver();
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
              You have no conversations yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <button
                key={`${conv.type}-${conv.id}`}
                onClick={() => {
                  // Navigation Logic
                  if (conv.type === 'donation') {
                    navigate(`/chat-donation/${conv.routeId}`);
                  } else if (conv.role === 'buyer') {
                    navigate(`/chat-item/${conv.itemId}`);
                  } else {
                    navigate(`/chat-item/${conv.itemId}?chatId=${conv.id}`);
                  }
                }}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                {/* Icon based on Type */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conv.type === 'donation' ? 'bg-[#7db038]/10' : 'bg-brand-purple/10'
                  }`}>
                  {conv.type === 'donation' ? (
                    <Gift size={18} className="text-[#7db038]" />
                  ) : (
                    <MessageCircle size={18} className="text-brand-purple" />
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {conv.itemTitle}
                    </p>
                    <span className={`text-xs uppercase tracking-wide ${conv.type === 'donation' ? 'text-[#7db038]' : 'text-gray-400'
                      }`}>
                      {/* Dynamic Label */}
                      {conv.type === 'donation'
                        ? (conv.role === 'donor' ? 'Donor' : 'Receiver')
                        : (conv.role === 'buyer' ? 'Seller' : 'Buyer')
                      }
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