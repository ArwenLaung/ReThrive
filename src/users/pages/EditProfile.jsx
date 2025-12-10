import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Loader2 } from 'lucide-react';

const EditProfile = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Initial State (Simplified)
  const [formData, setFormData] = useState({
    name: "Cindy Lim",
    email: "cindy@student.usm.my",
    avatarPreview: "https://i.pravatar.cc/150?img=5"
  });

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Image Upload Preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatarPreview: objectUrl }));
    }
  };

  // Mock Save Function
  const handleSave = () => {
    setIsSaving(true);

    // Simulate Backend API Call
    setTimeout(() => {
        console.log("Saving Data:", formData);
        setIsSaving(false);
        alert("Profile updated successfully!");
        navigate(-1);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white pb-20 pt-6 px-6">
      
      {/* --- HEADER --- */}
      <div className="max-w-xl mx-auto mb-8 flex items-center gap-4">
        <Link to="/accountdetails" className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-[#59287a] transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-extrabold text-[#59287a]">Edit Profile</h1>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        {/* --- AVATAR UPLOAD --- */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative group">
            <img 
              src={formData.avatarPreview} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full object-cover border-4 border-[#FEFAE0] shadow-md"
            />
            {/* Camera Overlay Button */}
            <label className="absolute bottom-0 right-0 bg-[#59287a] text-white p-2 rounded-full cursor-pointer hover:bg-[#451d5e] transition-colors shadow-sm">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <p className="mt-3 text-sm text-gray-500 font-medium">Tap icon to change photo</p>
        </div>

        {/* --- FORM SECTION --- */}
        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm space-y-5">
          
          {/* Name Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#59287a] outline-none bg-white font-medium text-[#59287a]"
            />
          </div>
          
          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Email (Cannot be changed)</label>
            <input 
              type="email" 
              value={formData.email}
              disabled
              className="w-full p-4 rounded-xl border-none bg-gray-100 text-gray-400 font-medium cursor-not-allowed"
            />
          </div>

        </div>

        {/* --- SAVE BUTTON --- */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
          {isSaving ? "Saving..." : "Save Changes"}
        </button>

      </div>
    </div>
  );
};

export default EditProfile;