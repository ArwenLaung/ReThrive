import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, User, Gift } from 'lucide-react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDocs,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

const DonationChat = () => {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [availableThreads, setAvailableThreads] = useState([]); 
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 1. Auth Listener
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
    const fetchDonation = async () => {
      if (!donationId) return;
      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId));
        if (donationDoc.exists()) {
          setDonation({ id: donationDoc.id, ...donationDoc.data() });
        } else {
          setDonation(null);
        }
      } catch (error) {
        console.error('Error fetching donation for chat:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDonation();
  }, [donationId]);

  // 3. Setup Threading Logic
  useEffect(() => {
    const setupThreading = async () => {
      if (!donation || !currentUser) return;

      const isDonor = donation.donorId === currentUser.uid;

      if (!isDonor) {
        try {
          const threadId = `${donation.id}_${currentUser.uid}`;
          const threadRef = doc(db, 'donations', donation.id, 'threads', threadId);
          
          const threadData = {
            donationId: donation.id,
            donationTitle: donation.title || '',
            donationImage: donation.image || '',
            donorId: donation.donorId,
            donorName: donation.donorName || 'Donor',
            receiverId: currentUser.uid,
            receiverName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Receiver',
            lastMessageAt: serverTimestamp(),
          };
          
          await setDoc(threadRef, threadData, { merge: true });
          setActiveThreadId(threadId);
        } catch (error) {
          console.error("Error setting up receiver thread:", error);
        }
      } else {
        try {
          const threadsRef = collection(db, 'donations', donation.id, 'threads');
          const snapshot = await getDocs(threadsRef);
          const threads = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          setAvailableThreads(threads);
          if (threads.length > 0) {
            setActiveThreadId(threads[0].id);
          }
        } catch (error) {
          console.error("Error loading donor threads:", error);
        }
      }
    };

    setupThreading();
  }, [donation, currentUser]);

// 4. Subscribe to Messages & Clear Unread Flags
  useEffect(() => {
    if (!donationId || !activeThreadId || !currentUser) { // Added currentUser check
      setMessages([]);
      return;
    }

    // --- NEW LOGIC: Clear "Unread" flag when you open the chat ---
    const clearUnread = async () => {
      try {
        const threadRef = doc(db, 'donations', donationId, 'threads', activeThreadId);
        const docSnap = await getDoc(threadRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isDonor = data.donorId === currentUser.uid;
          
          // If I am the donor, I clear my unread flag. If receiver, clear mine.
          if (isDonor && data.unreadForDonor) {
            await setDoc(threadRef, { unreadForDonor: false }, { merge: true });
          } else if (!isDonor && data.unreadForReceiver) {
            await setDoc(threadRef, { unreadForReceiver: false }, { merge: true });
          }
        }
      } catch (error) {
        console.error("Error clearing unread status:", error);
      }
    };
    clearUnread();
    // -----------------------------------------------------------

    const messagesRef = collection(db, 'donations', donationId, 'threads', activeThreadId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMessages(msgs);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [donationId, activeThreadId, currentUser]); // Added currentUser to dependencies

  // Updated Send Message Function
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !activeThreadId) return;

    setSending(true);
    try {
      const messagesRef = collection(db, 'donations', donationId, 'threads', activeThreadId, 'messages');
      const messageText = newMessage.trim();

      // 1. Add the message
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
      });

      // 2. Determine who is sending (Donor or Receiver?)
      const isDonorSender = donation.donorId === currentUser.uid;

      // 3. Update Thread with Last Message AND Unread Flags
      await setDoc(doc(db, 'donations', donationId, 'threads', activeThreadId), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        // If Donor sent it, it is Unread for Receiver (and vice versa)
        unreadForReceiver: isDonorSender, 
        unreadForDonor: !isDonorSender
      }, { merge: true });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
        <Loader2 className="animate-spin text-[#7db038]" size={48} />
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-4">Donation not found</p>
          <button
            onClick={() => navigate('/donation')}
            className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6a9630]"
          >
            Back to Donation Corner
          </button>
        </div>
      </div>
    );
  }

  const isDonor = currentUser && donation.donorId === currentUser.uid;
  const headerTitle = isDonor ? 'Chat with Receiver' : 'Chat with Donor';

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-24 pb-20 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-500">{donation.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7db038]/10 flex items-center justify-center">
              <User size={20} className="text-[#7db038]" />
            </div>
          </div>
        </div>
      </div>

      {/* Item Info Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <img
              src={donation.image}
              alt={donation.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 line-clamp-1">{donation.title}</h3>
              <p className="text-sm text-[#7db038] font-medium flex items-center gap-1">
                <Gift size={14} /> Free item
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Donor Selection Bar (Horizontal scroll like Item Chat) */}
      {isDonor && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Conversations for this donation
            </h2>
            {availableThreads.length === 0 ? (
              <p className="text-sm text-gray-500">No receivers have messaged yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableThreads.map((thread) => {
                  const isActive = activeThreadId === thread.id;
                  return (
                    <button
                      key={thread.id}
                      onClick={() => {
                        setActiveThreadId(thread.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border ${
                        isActive
                          ? 'bg-[#7db038] text-white border-[#7db038]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {thread.receiverName || 'Receiver'}
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
          {!activeThreadId ? (
            <div className="text-center py-12 text-gray-500">
               {isDonor ? 'Select a buyer conversation above to start chatting.' : 'Setting up your chat...'}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No messages yet. Start the conversation!</div>
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
                        ? 'bg-[#7db038] text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.createdAt && (
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-lime-100' : 'text-gray-500'
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7db038] focus:border-transparent outline-none"
              disabled={sending || !activeThreadId}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim() || !activeThreadId}
              className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6a9630] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

export default DonationChat;