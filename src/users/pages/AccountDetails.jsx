import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Mail, Loader2, User as UserIcon } from 'lucide-react';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import DefaultProfilePic from '../assets/default_profile_pic.jpg'; 

const AccountDetails = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          name: currentUser.displayName || currentUser.email.split('@')[0],
          email: currentUser.email,
          avatar: currentUser.photoURL || DefaultProfilePic
        });
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