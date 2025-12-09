import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Loader2 } from 'lucide-react';

const EditProfile = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Initial State (Mock Data)
  const [formData, setFormData] = useState({
    name: "Cindy Lim",
    phone: "+60 12-345 6789",
    school: "School of Computer Sciences",
    studentId: "158992",
    avatarPreview: "https://i.pravatar.cc/150?img=5"
  });

  // Separate state for Hostel logic
  const [hostelSelection, setHostelSelection] = useState("Desasiswa Restu");
  const [customHostel, setCustomHostel] = useState("");
  
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

    // Determine final hostel value
    const finalHostel = hostelSelection === "Other" ? customHostel : hostelSelection;

    // Simulate Backend API Call
    setTimeout(() => {
        console.log("Saving Data:", { ...formData, hostel: finalHostel });
        setIsSaving(false);
        alert("Profile updated successfully!");
        navigate('/accountdetails'); // Go back to details view
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

          {/* Student ID (Read Only) */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Student ID (Cannot be changed)</label>
            <input 
              type="text" 
              value={formData.studentId}
              disabled
              className="w-full p-4 rounded-xl border-none bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
            />
          </div>

          {/* Phone Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Phone Number</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#59287a] outline-none bg-white font-medium text-[#59287a]"
            />
          </div>

          {/* School Input (Dropdown) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">School / Department</label>
            <select 
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#59287a] outline-none bg-white font-medium text-[#59287a]"
            >
              <option>School of Computer Sciences</option>
              <option>School of Mathematical Sciences</option>
              <option>School of Management</option>
              <option>School of Arts</option>
              <option>School of HBP</option>
              <option>School of Biological Sciences</option>
              <option>School of Chemical Sciences</option>
              <option>School of Physics</option>
              <option>School of Pharmacy</option>
              <option>School of Social Sciences</option>
            </select>
          </div>

          {/* Hostel Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Hostel / Residence</label>
            <select 
              value={hostelSelection}
              onChange={(e) => setHostelSelection(e.target.value)}
              className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#59287a] outline-none bg-white font-medium text-[#59287a]"
            >
              <option>Desasiswa Restu</option>
              <option>Desasiswa Saujana</option>
              <option>Desasiswa Tekun</option>
              <option>Desasiswa Indah Kembara</option>
              <option>Desasiswa Aman Damai</option>
              <option>Desasiswa Fajar Harapan</option>
              <option>Desasiswa Bakti Permai</option>
              <option>Desasiswa Cahaya Gemilang</option>
              <option value="Other">Other (Please enter)</option>
            </select>

            {/* Custom Hostel Input (Only shows if 'Other' is selected) */}
            {hostelSelection === "Other" && (
              <input 
                type="text" 
                placeholder="Enter your residence name..."
                value={customHostel}
                onChange={(e) => setCustomHostel(e.target.value)}
                className="w-full mt-3 p-4 rounded-xl border-2 border-white focus:border-[#59287a] outline-none bg-white/50 font-medium text-[#59287a]"
                autoFocus
              />
            )}
          </div>
          
          {/* Email (Read Only) */}
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Email (Cannot be changed)</label>
            <input 
              type="email" 
              value="cindy@student.usm.my"
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