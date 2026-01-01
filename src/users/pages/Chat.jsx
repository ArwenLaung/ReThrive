import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, User } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

const Chat = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() };
          setOrder(orderData);
          
          // Check if user is buyer or seller
          if (currentUser && orderData.buyerId !== currentUser.uid && orderData.sellerId !== currentUser.uid) {
            alert("You don't have access to this chat.");
            navigate('/purchasehistory');
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    if (orderId && currentUser) {
      fetchOrder();
    }
  }, [orderId, currentUser, navigate]);

  useEffect(() => {
    if (!orderId || !currentUser) return;

    // Subscribe to messages for this order
    const messagesRef = collection(db, 'orders', orderId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Clear unread flag for this user when viewing the chat
      if (order) {
        const isBuyer = currentUser.uid === order.buyerId;
        const update = isBuyer
          ? { unreadForBuyer: false }
          : { unreadForSeller: false };
        try {
          await updateDoc(doc(db, 'orders', orderId), update);
        } catch (e) {
          console.error('Error clearing unread flags for order chat:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [orderId, currentUser, order]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !order) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'orders', orderId, 'messages');
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
      });

      // Update order's lastMessageAt and unread flags for the other party
      const isBuyerSender = currentUser.uid === order.buyerId;
      await updateDoc(doc(db, 'orders', orderId), {
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        unreadForBuyer: !isBuyerSender,
        unreadForSeller: isBuyerSender,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-purple" size={48} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Order not found</p>
          <button
            onClick={() => navigate('/purchasehistory')}
            className="bg-brand-purple text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-800"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const otherPartyId = currentUser?.uid === order.buyerId ? order.sellerId : order.buyerId;
  const otherPartyName = currentUser?.uid === order.buyerId ? order.sellerName : order.buyerName;
  const isBuyer = currentUser?.uid === order.buyerId;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/purchasehistory')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Chat</h1>
              <p className="text-sm text-gray-500">
                {isBuyer ? 'Seller' : 'Buyer'}: {otherPartyName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
                <User size={20} className="text-brand-purple" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Info Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <img
              src={order.itemImage}
              alt={order.itemTitle}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{order.itemTitle}</h3>
              <p className="text-sm text-gray-500">RM {order.itemPrice}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              order.status === 'completed' ? 'bg-green-100 text-green-800' :
              order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {order.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUser?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-brand-purple text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.createdAt && (
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-purple-100' : 'text-gray-500'
                      }`}>
                        {msg.createdAt.toDate ? 
                          new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          'Just now'
                        }
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-brand-purple text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
