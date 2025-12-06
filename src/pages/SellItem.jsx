import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react'; // Removed Sparkles
import { classifyImage } from '../utils/aiImage';
import { generateDescription } from '../utils/textGen';

// --- FIREBASE IMPORTS ---
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const SellItem = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("Good (Used, but well maintained)");
  const [locationSelection, setLocationSelection] = useState("Desasiswa Restu");
  const [customLocation, setCustomLocation] = useState("");

  // Loading States
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- HANDLERS ---
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 3) {
      alert("You can only upload a maximum of 3 images.");
      return;
    }

    setIsAnalyzingImage(true);

    const newImages = files.map((file) => ({
      file: file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);

    if (images.length === 0 && newImages.length > 0) {
      const firstImgUrl = newImages[0].preview;
      const imgElement = document.createElement("img");
      imgElement.src = firstImgUrl;

      imgElement.onload = async () => {
        try {
          const prediction = await classifyImage(imgElement);
          if (prediction) {
            setCategory(prediction.className);
          }
        } catch (error) {
          console.log("AI Classification skipped", error);
        }
        setIsAnalyzingImage(false);
      };
    } else {
      setIsAnalyzingImage(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateText = async () => {
    if (!keywords.trim() || !category) {
      alert("Please select a category and add some keywords.");
      return;
    }
    setIsGeneratingText(true);
    const result = await generateDescription(keywords, category);
    setTitle(result.title);
    setDescription(result.description);
    setIsGeneratingText(false);
  };

  const handlePostItem = async () => {
    if (images.length === 0 || !title || !price || !category) {
      alert("Please fill in all fields and upload at least one image.");
      return;
    }

    const finalLocation = locationSelection === "Other" ? customLocation : locationSelection;
    if (!finalLocation.trim()) {
      alert("Please specify the location.");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          try {
            const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const storageRef = ref(storage, `items/${Date.now()}_${index}_${cleanName}`);
            const snapshot = await uploadBytes(storageRef, imgObj.file);
            return await getDownloadURL(snapshot.ref);
          } catch (uploadError) {
            console.error("Upload failed, using placeholder:", uploadError);
            return `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/400/300`;
          }
        })
      );

      await addDoc(collection(db, "items"), {
        title, description, price: Number(price), category,
        location: finalLocation, condition, images: imageUrls,
        image: imageUrls[0], createdAt: serverTimestamp(),
      });

      alert("Success! Item is posted on the Marketplace.");
      navigate('/marketplace');

    } catch (error) {
      console.error("Critical Error:", error);
      alert(`Failed to post: ${error.message}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-[#59287a] transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Sell an Item</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Main grid container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Upload Photos */}
          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Upload Photos (Maximum 3)
              </h2>

              <div className="grid grid-cols-2 gap-3 flex-grow content-start">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#dccae8] group">
                    <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                    {index === 0 && !isAnalyzingImage && category && (
                      <div className="absolute bottom-1 left-1 right-1 bg-green-500/90 text-white text-xs py-1 px-2 rounded-lg text-center backdrop-blur-sm">
                        Detected: {category}
                      </div>
                    )}
                  </div>
                ))}

                {images.length < 3 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#dccae8] rounded-2xl cursor-pointer bg-[#f3eefc]/50 hover:bg-[#f3eefc] transition-colors">
                    {isAnalyzingImage ? (
                      <Loader2 className="animate-spin text-[#59287a]" />
                    ) : (
                      <>
                        <div className="bg-[#f3eefc] p-3 rounded-full mb-2">
                          <Upload className="w-6 h-6 text-[#59287a]" />
                        </div>
                        <span className="text-xs font-bold text-[#59287a]">Add Photo</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </section>
          </div>

          {/* Item Details & Post */}
          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 h-full">
              
              {/* Details Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  Item Details
                </h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white">
                        <option value="" disabled>Select category...</option>
                        <option>Hostel Essentials</option><option>Electronics</option><option>Books</option><option>Stationery</option><option>Fashion & Accessories</option><option>Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                      <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white">
                        <option>Good (Used, but well maintained)</option><option>Brand New</option><option>Like New</option><option>Fair (Visible signs of use)</option><option>Heavily Used</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords for AI-Generated Title & Description</label>
                    <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. Blue Nike running shoes, size 9, worn twice, bought for RM200" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none h-24 resize-none" />
                    
                    {/* Auto-Generate Button */}
                    <button onClick={handleGenerateText} disabled={isGeneratingText || !keywords} className="mt-3 w-full bg-[#f3eefc] text-[#59287a] font-bold py-3 rounded-xl hover:bg-[#dccae8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {isGeneratingText && <Loader2 className="animate-spin" size={18} />} 
                      {isGeneratingText ? "Writing..." : "Auto-Generate Title & Description"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none font-bold text-gray-800" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none h-32" /></div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Price & Location Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Price & Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price (RM)</label>
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                    <select value={locationSelection} onChange={(e) => setLocationSelection(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white mb-2">
                      <option>Desasiswa Restu</option><option>Desasiswa Saujana</option><option>Desasiswa Tekun</option><option>Desasiswa Aman Damai</option><option>Desasiswa Indah Kembara</option>
                      <option>Desasiswa Fajar Harapan</option><option>Desasiswa Bakti Permai</option><option>Desasiswa Cahaya Gemilang</option><option>Main Library</option><option value="Other">Other (Please enter)</option>
                    </select>
                    {locationSelection === "Other" && (
                      <input type="text" placeholder="Enter specific location..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} className="w-full p-3 rounded-xl border border-[#dccae8] bg-[#f3eefc] focus:ring-2 focus:ring-[#59287a] outline-none" autoFocus />
                    )}
                  </div>
                </div>
              </div>

              {/* POST BUTTON */}
              <div className="pt-4 mt-auto">
                <button onClick={handlePostItem} disabled={isSubmitting} className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="animate-spin" /> Posting...</> : "Post Item Now"}
                </button>
              </div>

            </section>
          </div>

        </div>
      </main>
    </div>
  );
};

export default SellItem;