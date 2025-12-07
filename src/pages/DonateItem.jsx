import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X, Gift } from 'lucide-react'; 
import { classifyImage } from '../utils/aiImage';
import { generateDescription } from '../utils/textGen';

// --- FIREBASE IMPORTS ---
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DonateItem = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("Good");
  const [locationSelection, setLocationSelection] = useState("Desasiswa Restu");
  const [customLocation, setCustomLocation] = useState("");
  
  // NEW: Donor Details
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  // Loading States
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- IMAGE HANDLER ---
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (images.length + files.length > 3) {
      alert("Max 3 images.");
      return;
    }

    setIsAnalyzingImage(true);

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);

    // Only analyze the first image if it's the first image being uploaded
    if (images.length === 0 && newImages.length > 0) {
      const firstImgUrl = newImages[0].preview;
      const imgElement = document.createElement("img");
      imgElement.crossOrigin = "anonymous"; // For CORS if needed
      imgElement.src = firstImgUrl;

      imgElement.onload = async () => {
        try {
          console.log("Analyzing image with AI...");
          const prediction = await classifyImage(imgElement);
          if (prediction && prediction.className) {
            setCategory(prediction.className);
            console.log(`AI detected category: ${prediction.className} (confidence: ${(prediction.probability * 100).toFixed(1)}%)`);
          } else {
            console.log("AI classification returned no result or low confidence");
          }
        } catch (error) {
          console.error("AI Classification error:", error);
        } finally {
          setIsAnalyzingImage(false);
        }
      };
      
      imgElement.onerror = () => {
        console.error("Failed to load image for analysis");
        setIsAnalyzingImage(false);
      };
    } else {
      setIsAnalyzingImage(false);
    }
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // --- AI TEXT GENERATION HANDLER ---
  const handleGenerateText = async () => {
    if (!keywords.trim() || !category) {
      alert("Please select a category and add some keywords.");
      return;
    }
    
    setIsGeneratingText(true);
    
    try {
      // Try to get image data URL for enhanced AI generation
      let imageDataUrl = null;
      if (images.length > 0 && images[0].preview) {
        try {
          // Convert preview URL to data URL for AI analysis
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = images[0].preview;
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve();
            };
            img.onerror = reject;
          });
        } catch (imgError) {
          console.log("Could not convert image for AI analysis, using text-only:", imgError);
        }
      }
      
      console.log("Generating title and description with AI...");
      const result = await generateDescription(keywords, category, imageDataUrl);
      setTitle(result.title);
      setDescription(result.description);
      console.log("AI generation complete!");
    } catch (error) {
      console.error("Error generating text:", error);
      alert("Failed to generate text. Please try again or enter manually.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  // --- SUBMIT HANDLER ---
  const handleDonate = async () => {
    if (images.length === 0 || !title || !donorName || !category) {
      alert("Please upload an image, fill in title, and your name.");
      return;
    }

    const finalLocation = locationSelection === "Other" ? customLocation : locationSelection;
    setIsSubmitting(true);

    try {
      // 1. Upload Images
      const imageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const storageRef = ref(storage, `donations/${Date.now()}_${index}_${cleanName}`);
          const snapshot = await uploadBytes(storageRef, imgObj.file);
          return await getDownloadURL(snapshot.ref);
        })
      );

      // 2. Save to "donations" collection
      await addDoc(collection(db, "donations"), {
        title, 
        description, 
        category,
        location: finalLocation, 
        condition, 
        images: imageUrls,
        image: imageUrls[0], // Main display image
        donorName,    // NEW FIELD
        donorEmail,   // NEW FIELD
        createdAt: serverTimestamp(),
      });

      alert("Thank you! Your donation has been posted.");
      navigate('/donationcorner');

    } catch (error) {
      console.error("Error:", error);
      alert("Failed to post donation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-teal-100">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/donation" className="text-gray-600 hover:text-teal-600 transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-teal-900">Donate an Item</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-teal-100 space-y-6">
            
            {/* Image Upload Section */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Item Photos</label>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200">
                            <img src={img.preview} className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"><X size={12}/></button>
                            {idx === 0 && !isAnalyzingImage && category && (
                                <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-[10px] py-1 px-2 text-center backdrop-blur-sm">
                                    Detected: {category}
                                </div>
                            )}
                        </div>
                    ))}
                    {images.length < 3 && (
                        <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-teal-300 rounded-xl cursor-pointer bg-teal-50 hover:bg-teal-100 text-teal-600">
                            {isAnalyzingImage ? (
                                <Loader2 className="animate-spin text-teal-600" size={20} />
                            ) : (
                                <>
                                    <Upload size={20} />
                                    <span className="text-[10px] font-bold mt-1">Upload</span>
                                </>
                            )}
                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" multiple />
                        </label>
                    )}
                </div>
            </div>

            <hr className="border-gray-100"/>

            {/* Donor Info (NEW SECTION) */}
            <div>
                <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-4">Your Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Your Name</label>
                        <input type="text" value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Display Name" className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email / Contact (Optional)</label>
                        <input type="text" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} placeholder="How can they reach you?" className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none" />
                    </div>
                </div>
            </div>

            <hr className="border-gray-100"/>

            {/* Item Details */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wider mb-4">Item Details</h2>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none bg-white">
                            <option value="" disabled>Select...</option>
                            <option>Hostel Essentials</option><option>Books</option><option>Stationery</option><option>Others</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Condition</label>
                        <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none bg-white">
                            <option>Good</option><option>Brand New</option><option>Fair</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Keywords for AI-Generated Title & Description</label>
                    <textarea value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. Science textbook, used for 2 semesters, good condition" className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none h-24 resize-none" />
                    
                    {/* Auto-Generate Button */}
                    <button onClick={handleGenerateText} disabled={isGeneratingText || !keywords} className="mt-3 w-full bg-teal-50 text-teal-700 font-bold py-3 rounded-xl hover:bg-teal-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {isGeneratingText && <Loader2 className="animate-spin" size={18} />} 
                        {isGeneratingText ? "Writing..." : "Auto-Generate Title & Description"}
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-gray-800" placeholder="e.g. Science Textbook" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                    <select value={locationSelection} onChange={e => setLocationSelection(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none bg-white mb-2">
                        <option>Desasiswa Restu</option><option>Desasiswa Saujana</option><option>Desasiswa Tekun</option><option value="Other">Other</option>
                    </select>
                    {locationSelection === "Other" && (
                        <input type="text" placeholder="Enter specific location..." value={customLocation} onChange={e => setCustomLocation(e.target.value)} className="w-full p-3 rounded-xl border border-teal-200 bg-teal-50 focus:border-teal-500 outline-none" />
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Description (Optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none h-24" placeholder="Briefly describe the item..." />
                </div>
            </div>

            {/* Submit Button */}
            <button onClick={handleDonate} disabled={isSubmitting} className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-teal-700 transition-all active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="animate-spin" /> Processing...</> : <><Gift /> Post Donation</>}
            </button>

        </div>
      </main>
    </div>
  );
};

export default DonateItem;