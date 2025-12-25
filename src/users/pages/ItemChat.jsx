import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, User } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const ItemChat = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // itemChats doc for this thread
  const [sellerChats, setSellerChats] = useState([]); // list of chats when viewing as seller
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const previousMessagesCountRef = useRef(0);

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

  // Fetch item details
  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;
      try {
        const itemDoc = await getDoc(doc(db, 'items', itemId));
        if (itemDoc.exists()) {
          setItem({ id: itemDoc.id, ...itemDoc.data() });
        } else {
          setItem(null);
        }
      } catch (error) {
        console.error('Error fetching item for chat:', error);
      } finally {
        setLoading(false);
      }
    };
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  // Ensure or load dedicated chat thread
  useEffect(() => {
    const setupChat = async () => {
      if (!item || !currentUser) return;

      const isSeller = item.sellerId === currentUser.uid;

      if (!isSeller) {
        // Buyer: use deterministic chat id so we don't need a query/index
        try {
          const chatId = `${item.id}_${currentUser.uid}`;
          const chatRef = doc(db, 'itemChats', chatId);

          // Create or update minimal chat metadata; messages are handled separately
          const newChat = {
            itemId: item.id,
            itemTitle: item.title || '',
            itemImage: item.image || '',
            sellerId: item.sellerId || '',
            sellerName: item.sellerName || 'Seller',
            buyerId: currentUser.uid,
            buyerName:
              currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              'Buyer',
          };
          await setDoc(chatRef, newChat, { merge: true });
          setActiveChat({ id: chatRef.id, ...newChat });
        } catch (error) {
          console.error('Error setting up buyer chat:', error);
        }
      } else {
        // Seller: load all chats for this seller, then filter by item
        try {
          const chatsRef = collection(db, 'itemChats');
          const qChats = query(chatsRef, where('sellerId', '==', currentUser.uid));
          const snapshot = await getDocs(qChats);
          const allChats = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          // Only show buyers who have at least one message (lastMessage is set)
          const filtered = allChats.filter(
            (c) => c.itemId === item.id && c.lastMessage && c.lastMessage !== ''
          );
          // Deduplicate by buyerId so each buyer appears only once
          const byBuyer = new Map();
          filtered.forEach((c) => {
            const key = c.buyerId || c.buyerName || c.id;
            const existing = byBuyer.get(key);
            const currentTs =
              c.lastMessageAt && c.lastMessageAt.toMillis
                ? c.lastMessageAt.toMillis()
                : 0;
            const existingTs =
              existing && existing.lastMessageAt && existing.lastMessageAt.toMillis
                ? existing.lastMessageAt.toMillis()
                : 0;
            if (!existing || currentTs > existingTs) {
              byBuyer.set(key, c);
            }
          });
          const chats = Array.from(byBuyer.values());
          setSellerChats(chats);
          if (chats.length > 0) {
            setActiveChat(chats[0]);
          } else {
            setActiveChat(null);
          }
        } catch (error) {
          console.error('Error loading seller chats:', error);
        }
      }
    };

    setupChat();
  }, [item, currentUser]);

  // Subscribe to messages of the active chat
  useEffect(() => {
    if (!activeChat || !currentUser) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'itemChats', activeChat.id, 'messages');
    const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(qMessages, async (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Simple in-page notification for new incoming messages
      if (
        previousMessagesCountRef.current > 0 &&
        msgs.length > previousMessagesCountRef.current
      ) {
        const latest = msgs[msgs.length - 1];
        if (latest.senderId && latest.senderId !== currentUser?.uid) {
          setNotifType('info');
          setNotifMessage(`New message from ${latest.senderName || 'User'}`);
        }
      }
      previousMessagesCountRef.current = msgs.length;

      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Clear unread flag for this user when viewing this chat
      const isBuyer = currentUser.uid === activeChat.buyerId;
      const update = isBuyer
        ? { unreadForBuyer: false }
        : { unreadForSeller: false };
      try {
        await updateDoc(doc(db, 'itemChats', activeChat.id), update);
      } catch (e) {
        console.error('Error clearing unread flags for item chat:', e);
      }
    });

    return () => unsubscribe();
  }, [activeChat, currentUser]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    try {
      let chat = activeChat;

      // If chat thread is not ready yet, create or load it
      if (!chat) {
        if (!item) {
          setSending(false);
          return;
        }
        const isSeller = item.sellerId === currentUser.uid;
        if (isSeller) {
          alert('Select a buyer conversation above before sending a message.');
          setSending(false);
          return;
        }

        // Buyer: deterministic chat id
        const chatId = `${item.id}_${currentUser.uid}`;
        const chatRef = doc(db, 'itemChats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (chatSnap.exists()) {
          chat = { id: chatRef.id, ...chatSnap.data() };
        } else {
          const newChat = {
            itemId: item.id,
            itemTitle: item.title || '',
            itemImage: item.image || '',
            sellerId: item.sellerId || '',
            sellerName: item.sellerName || 'Seller',
            buyerId: currentUser.uid,
            buyerName:
              currentUser.displayName ||
              currentUser.email?.split('@')[0] ||
              'Buyer',
            lastMessage: '',
            lastMessageAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };
          await setDoc(chatRef, newChat, { merge: true });
          chat = { id: chatRef.id, ...newChat };
        }

        setActiveChat(chat);
      }

      if (!chat) {
        setSending(false);
        return;
      }

      const messagesRef = collection(db, 'itemChats', chat.id, 'messages');
      const messageText = newMessage.trim();

      const messageData = {
        text: messageText,
        senderId: currentUser.uid,
        senderName:
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'User',
        buyerId: chat.buyerId,
        sellerId: chat.sellerId,
        itemId: chat.itemId,
        createdAt: serverTimestamp(),
      };

      await addDoc(messagesRef, messageData);

      // Update chat metadata and unread flags
      const isBuyerSender = currentUser.uid === chat.buyerId;
      await updateDoc(doc(db, 'itemChats', chat.id), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        unreadForBuyer: !isBuyerSender,
        unreadForSeller: isBuyerSender,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending item message:', error);
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

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Item not found</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-brand-purple text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-800"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isSeller = currentUser && item && item.sellerId === currentUser.uid;
  const headerTitle = isSeller ? 'Chat with Buyer' : 'Chat with Seller';

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-24 pb-20 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-500">{item.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center">
              <User size={20} className="text-brand-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Item Info Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <img
              src={item.image}
              alt={item.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
              <p className="text-sm text-gray-500">RM {item.price}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seller chat list (multiple buyers) */}
      {isSeller && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Conversations for this item
            </h2>
            {sellerChats.length === 0 ? (
              <p className="text-sm text-gray-500">
                No buyers have started a conversation yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sellerChats.map((chat) => {
                  const isActive = activeChat && activeChat.id === chat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat);
                        previousMessagesCountRef.current = 0;
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border ${isActive
                          ? 'bg-brand-purple text-white border-brand-purple'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {chat.buyerName || 'Buyer'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {!activeChat ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {isSeller
                  ? 'Select a buyer conversation above to start chatting.'
                  : 'Setting up your chat...'}
              </p>
            </div>
          ) : messages.length === 0 ? (
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
                    className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${isOwnMessage
                        ? 'bg-brand-purple text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                  >
                    <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.createdAt && (
                      <p
                        className={`text-xs mt-1 ${isOwnMessage ? 'text-purple-100' : 'text-gray-500'
                          }`}
                      >
                        {msg.createdAt.toDate
                          ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Just now'}
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
              disabled={sending || !newMessage.trim() || !activeChat}
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

export default ItemChat;
