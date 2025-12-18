import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X, Save, AlertCircle, MapPin, Ban } from 'lucide-react';
import { classifyImage } from '../../utils/aiImage';
import { generateDescription } from '../../utils/textGen';
import { db, storage, auth } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const MyDonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- STATE ---
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [locationSelection, setLocationSelection] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  // Donor Details
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  // Loading States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const PREDEFINED_LOCATIONS = [
    "Desasiswa Restu", "Desasiswa Saujana", "Desasiswa Tekun", 
    "Desasiswa Aman Damai", "Desasiswa Indah Kembara", 
    "Desasiswa Fajar Harapan", "Desasiswa Bakti Permai", 
    "Desasiswa Cahaya Gemilang", "Main Library"
  ];

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const docRef = doc(db, "donations", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Security Check: Ensure current user is the donor
          if (data.donorId && data.donorId !== user.uid) {
            setIsUnauthorized(true);
            setTimeout(() => navigate('/mydonations'), 3000);
            return;
          }

          // Populate Form
          setTitle(data.title);
          setDescription(data.description);
          setCategory(data.category);
          setDonorName(data.donorName || "");
          setDonorEmail(data.donorEmail || "");
          setCondition(data.condition || "Used");

          // Handle Images
          if (data.images && Array.isArray(data.images)) {
            const formattedImages = data.images.map(url => ({
              file: null,
              preview: url,
              isExisting: true
            }));
            setImages(formattedImages);
          } else if (data.image) {
            setImages([{ file: null, preview: data.image, isExisting: true }]);
          }

          // Handle Location
          if (PREDEFINED_LOCATIONS.includes(data.location)) {
            setLocationSelection(data.location);
          } else {
            setLocationSelection("Other");
            setCustomLocation(data.location);
          }

        } else {
          setError("Donation not found");
          setTimeout(() => navigate('/mydonations'), 2000);
        }
      } catch (error) {
        console.error("Error fetching donation:", error);
        setError("Failed to load donation.");
      } finally {
        setIsLoadingData(false);
      }
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // --- 2. HANDLERS ---
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (images.length + files.length > 3) {
      alert("Max 3 images.");
      return;
    }
    setIsAnalyzingImage(true);
    const newImages = files.map((file) => ({
      file: file,
      preview: URL.createObjectURL(file),
      isExisting: false
    }));
    setImages((prev) => [...prev, ...newImages]);

    if (newImages.length > 0) {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = newImages[0].preview;
      img.onload = async () => {
        try {
          const prediction = await classifyImage(img);
          if (prediction?.className) setCategory(prediction.className);
        } finally {
          setIsAnalyzingImage(false);
        }
      };
    } else {
      setIsAnalyzingImage(false);
    }
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleGenerateText = async () => {
    if (!keywords.trim() || !category) {
      alert("Select category & add keywords first."); return;
    }
    setIsGeneratingText(true);
    try {
      const result = await generateDescription(keywords, category, null);
      setTitle(result.title);
      setDescription(result.description);
    } catch (e) { console.error(e); } 
    finally { setIsGeneratingText(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (images.length === 0 || !title || !category) {
      setError("Please fill in all required fields."); return;
    }
    const finalLocation = locationSelection === "Other" ? customLocation : locationSelection;
    if (!finalLocation.trim()) { setError("Location required."); return; }

    setIsSubmitting(true);
    setError("");

    try {
      const finalImageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          if (imgObj.isExisting) return imgObj.preview;
          const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const storageRef = ref(storage, `donations/${Date.now()}_${index}_${cleanName}`);
          const snapshot = await uploadBytes(storageRef, imgObj.file);
          return await getDownloadURL(snapshot.ref);
        })
      );

      const itemRef = doc(db, "donations", id);
      await updateDoc(itemRef, {
        title: title.trim(),
        description: description.trim(),
        category,
        location: finalLocation.trim(),
        condition, 
        images: finalImageUrls,
        image: finalImageUrls[0],
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        updatedAt: serverTimestamp(),
      });

      alert("Donation updated successfully!");
      navigate('/mydonations');
    } catch (err) {
      console.error("Error updating:", err);
      setError("Failed to update donation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="min-h-screen flex items-center justify-center bg-[#9af71e]/5"><Loader2 className="animate-spin text-[#7db038]" size={40} /></div>;
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9af71e]/5 px-4 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-4">
          <Ban className="text-red-500 w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <button onClick={() => navigate('/mydonations')} className="bg-[#7db038] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#4a6b1d] transition-colors">
          Back to My Donations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-[#7db038]/20">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/mydonations" className="text-gray-600 hover:text-[#7db038] transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-[#364f15]">Edit Donation</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
            <AlertCircle size={20} />
            <p className="font-medium">{error}</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* --- LEFT COLUMN: Photos (Sticky) --- */}
          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#7db038]/20 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-[#364f15] mb-4">Donation Photos (Max 3)</h2>
              <div className="grid grid-cols-2 gap-3 flex-grow content-start">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#7db038]/20 group">
                    <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"><X size={16} /></button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#7db038]/40 rounded-2xl cursor-pointer bg-[#7db038]/5 hover:bg-[#7db038]/10 transition-colors">
                    {isAnalyzingImage ? <Loader2 className="animate-spin text-[#7db038]" /> : <><div className="bg-[#7db038]/10 p-3 rounded-full mb-2"><Upload className="w-6 h-6 text-[#7db038]" /></div><span className="text-xs font-bold text-[#364f15]">Add Photo</span></>}
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} ref={fileInputRef} />
                  </label>
                )}
              </div>
            </section>
          </div>

          {/* --- RIGHT COLUMN: Details Form --- */}
          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#7db038]/20 space-y-6 h-full">
              
              {/* Item Details */}
              <div>
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Donation Details</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none bg-white">
                        <option value="" disabled>Select category...</option>
                        <option>Hostel Essentials</option><option>Electronics</option><option>Books</option><option>Stationery</option><option>Fashion & Accessories</option><option>Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                      <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none bg-white">
                        <option value="Brand New">Brand New</option>
                        <option value="Like New">Like New</option>
                        <option value="Lightly Used">Lightly Used</option>
                        <option value="Well Used">Well Used</option>
                        <option value="Heavily Used">Heavily Used</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords for AI (Optional)</label>
                    <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Type new keywords to regenerate title/description..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none h-24 resize-none" />
                    <button onClick={handleGenerateText} disabled={isGeneratingText || !keywords} className="mt-3 w-full bg-[#7db038]/10 text-[#364f15] font-bold py-3 rounded-xl hover:bg-[#7db038]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {isGeneratingText ? "Writing..." : "Auto-Generate Title & Description"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none font-bold text-gray-800" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none h-32" /></div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Your Details (Editable) */}
              <div>
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Donor Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                    <input type="text" value={donorName} onChange={e => setDonorName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email / Contact</label>
                    <input type="text" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none" />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Location */}
              <div>
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <MapPin size={16} /> Pickup Location
                    </label>
                    <select value={locationSelection} onChange={(e) => setLocationSelection(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7db038] outline-none bg-white mb-2">
                      {PREDEFINED_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      <option value="Other">Other</option>
                    </select>
                    {locationSelection === "Other" && <input type="text" placeholder="Enter location..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} className="w-full p-3 rounded-xl border border-[#7db038]/40 bg-[#7db038]/5 focus:ring-2 focus:ring-[#7db038] outline-none" />}
                  </div>
                </div>
              </div>

              {/* UPDATE BUTTON */}
              <div className="pt-4 mt-auto">
                <button onClick={handleUpdate} disabled={isSubmitting} className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="animate-spin" size={24} /> Updating...</> : <><Save size={20} /> Update Donation</>}
                </button>
              </div>

            </section>
          </div>

        </div>
      </main>
    </div>
  );
};

export default MyDonationDetail;