import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Loader2 } from 'lucide-react';
import { auth, storage, db } from '../../firebase';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore'; 
import DefaultProfilePic from '../assets/default_profile_pic.jpg';

const EditProfile = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(DefaultProfilePic);
  const [imageFile, setImageFile] = useState(null); 

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.displayName || "");
      setEmail(currentUser.email || "");
      setAvatarPreview(currentUser.photoURL || DefaultProfilePic);
      setLoading(false);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file); 
      setAvatarPreview(URL.createObjectURL(file)); 
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    if (!auth.currentUser) {
        alert("No user logged in.");
        return;
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      let photoURL = currentUser.photoURL;

      // Upload Image
      if (imageFile) {
        const storageRef = ref(storage, `profile_pictures/${currentUser.uid}`);
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update Auth Profile
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoURL
      });

      // Force local reload
      await currentUser.reload();
      
      // Force Token Refresh to trigger Header Listener
      await currentUser.getIdToken(true);

      // Update Firestore
      await setDoc(doc(db, "users", currentUser.uid), {
        displayName: name,
        email: email,
        photoURL: photoURL,
        updatedAt: new Date()
      }, { merge: true });

      alert("Profile updated successfully!");
      navigate(-1); // Go back to previous page

    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile: " + error.message);
    } finally {
      setIsSaving(false);
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
        <Link to="/accountdetails" className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-[#59287a] transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-extrabold text-[#59287a]">Edit Profile</h1>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative group">
            <img 
              src={avatarPreview} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full object-cover border-4 border-[#FEFAE0] shadow-md bg-gray-200"
            />
            <label className="absolute bottom-0 right-0 bg-[#59287a] text-white p-2 rounded-full cursor-pointer hover:bg-[#451d5e] transition-colors shadow-sm">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <p className="mt-3 text-sm text-gray-500 font-medium">Tap icon to change photo</p>
        </div>

        <div className="bg-[#FEFAE0] rounded-[2rem] p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-xl border-none focus:ring-2 focus:ring-[#59287a] outline-none bg-white font-medium text-[#59287a]"
              placeholder="Enter your name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Email (Cannot be changed)</label>
            <input 
              type="email" 
              value={email}
              disabled
              className="w-full p-4 rounded-xl border-none bg-gray-100 text-gray-400 font-medium cursor-not-allowed"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
          {isSaving ? "Saving..." : "Save Changes"}
        </button>

      </div>
    </div>
  );
};

export default EditProfile;