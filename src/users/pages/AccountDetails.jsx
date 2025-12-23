import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Mail, Loader2, User as UserIcon, CreditCard, Save } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import DefaultProfilePic from '../assets/default_profile_pic.jpg'; 

const AccountDetails = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [hasBankInfo, setHasBankInfo] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email.split('@')[0],
          email: currentUser.email,
          avatar: currentUser.photoURL || DefaultProfilePic
        });

        // Load bank info from users collection
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            const bName = data.bankName || '';
            const bNo = data.bankAccountNumber || '';
            const bHolder = data.bankAccountHolder || '';
            setBankName(bName);
            setBankAccountNumber(bNo);
            setBankAccountHolder(bHolder);
            setHasBankInfo(!!(bName && bNo && bHolder));
          }
        } catch (e) {
          console.error('Error loading bank info:', e);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Reusable Info Row Component
  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 py-4 border-b border-[#59287a]/10 last:border-0">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#59287a]">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-[#59287a] font-semibold text-lg truncate max-w-[250px]">{value}</p>
      </div>
    </div>
  );

  const handleSaveBankInfo = async () => {
    if (!user?.uid) return;
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()) {
      alert('Please fill in all bank fields.');
      return;
    }

    setSavingBank(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountHolder: bankAccountHolder.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
      setHasBankInfo(true);
      setEditingBank(false);
      alert('Bank information saved.');
    } catch (e) {
      console.error('Error saving bank info:', e);
      alert('Failed to save bank information. Please try again.');
    } finally {
      setSavingBank(false);
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
    <div className="min-h-screen bg-white pb-20 pt-6 px-6">
      
      <div className="max-w-xl mx-auto mb-8 flex items-center gap-4">
        <Link to="/myaccount" className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-[#59287a] transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-extrabold text-[#59287a]">Account Details</h1>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        <div className="bg-[#FEFAE0] rounded-[2rem] p-8 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#59287a]/5 rounded-full"></div>
          
          <img 
            src={user?.avatar} 
            alt="Profile" 
            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md mx-auto mb-4 bg-gray-200"
          />
          <h2 className="text-2xl font-bold text-[#59287a]">{user?.name}</h2>
        </div>

        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Info</h3>
          <InfoRow icon={UserIcon} label="Display Name" value={user?.name} />
          <InfoRow icon={Mail} label="Email Address" value={user?.email} />
        </div>

        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Bank Information
            </h3>
            {!editingBank && (
              <button
                onClick={() => setEditingBank(true)}
                className="text-xs font-semibold text-[#59287a] hover:text-purple-900 flex items-center gap-1"
              >
                <Edit3 size={14} /> {hasBankInfo ? 'Edit' : 'Add'}
              </button>
            )}
          </div>

          {!editingBank ? (
            hasBankInfo ? (
              <div className="space-y-3">
                <InfoRow icon={CreditCard} label="Bank Name" value={bankName} />
                <InfoRow icon={CreditCard} label="Account Holder" value={bankAccountHolder} />
                <InfoRow icon={CreditCard} label="Account Number" value={bankAccountNumber} />
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No bank information saved yet. Add your bank details to make future payouts easier.
              </p>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white text-sm"
                  placeholder="e.g. Maybank"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white text-sm"
                  placeholder="Name on bank account"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white text-sm"
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBank(false);
                  }}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBankInfo}
                  disabled={savingBank}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#59287a] text-white text-xs font-semibold shadow-sm hover:bg-[#451d5e] disabled:opacity-60"
                >
                  {savingBank ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {savingBank ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => navigate('/editprofile')}
          className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <Edit3 size={20} /> Edit Profile
        </button>

      </div>
    </div>
  );
};

export default AccountDetails;