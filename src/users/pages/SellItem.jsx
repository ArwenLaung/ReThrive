import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react';
import { classifyImage } from '../../utils/aiImage';
import { generateDescription } from '../../utils/textGen';

// --- FIREBASE IMPORTS ---
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const SellItem = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("Lightly Used"); 
  const [locationSelection, setLocationSelection] = useState("Desasiswa Restu");
  const [customLocation, setCustomLocation] = useState("");

  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerId, setSellerId] = useState("");

  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setSellerId(user.uid);
        setSellerName(user.displayName || user.email || "");
        setSellerEmail(user.email || "");
      }
    });
    return () => unsubscribe();
  }, []);

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
      imgElement.crossOrigin = "anonymous";
      imgElement.src = firstImgUrl;
      imgElement.onload = async () => {
        try {
          const prediction = await classifyImage(imgElement);
          if (prediction?.className) setCategory(prediction.className);
        } catch (error) {
          console.error("AI Error:", error);
        } finally {
          setIsAnalyzingImage(false);
        }
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
    try {
      const result = await generateDescription(keywords, category, null);
      setTitle(result.title);
      setDescription(result.description);
    } catch (error) {
      console.error("Error generating text:", error);
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handlePostItem = async () => {
    if (images.length === 0 || !title || !price || !category) {
      alert("Please fill in all required fields and upload at least one image.");
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
          const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const storageRef = ref(storage, `items/${Date.now()}_${index}_${cleanName}`);
          const snapshot = await uploadBytes(storageRef, imgObj.file);
          return await getDownloadURL(snapshot.ref);
        })
      );

      await addDoc(collection(db, "items"), {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        location: finalLocation.trim(),
        condition,
        images: imageUrls,
        image: imageUrls[0],
        createdAt: serverTimestamp(),
        status: "active",
        sellerId: sellerId || (currentUser ? currentUser.uid : null),
        sellerName: sellerName || (currentUser ? (currentUser.displayName || "Anonymous") : ""),
        sellerEmail: sellerEmail || (currentUser ? currentUser.email : null),
      });

      alert("Success! Your item has been posted.");
      navigate('/marketplace');
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to post item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-[#59287a] transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Sell an Item</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Upload Item Photos (Max 3)</h2>
              <div className="grid grid-cols-2 gap-3 flex-grow content-start">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#dccae8] group">
                    <img src={img.preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"><X size={16} /></button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#dccae8] rounded-2xl cursor-pointer bg-[#f3eefc]/50 hover:bg-[#f3eefc] transition-colors">
                    {isAnalyzingImage ? <Loader2 className="animate-spin text-[#59287a]" /> : <><div className="bg-[#f3eefc] p-3 rounded-full mb-2"><Upload className="w-6 h-6 text-[#59287a]" /></div><span className="text-xs font-bold text-[#59287a]">Add Photo</span></>}
                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" multiple />
                  </label>
                )}
              </div>
            </section>
          </div>

          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 h-full">
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Item Details</h2>
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
                        <option value="Brand New">Brand New</option>
                        <option value="Like New">Like New</option>
                        <option value="Lightly Used">Lightly Used</option>
                        <option value="Well Used">Well Used</option>
                        <option value="Heavily Used">Heavily Used</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords for AI</label>
                    <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. Blue Nike shoes, size 9" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none h-24 resize-none" />
                    <button onClick={handleGenerateText} disabled={isGeneratingText || !keywords} className="mt-3 w-full bg-[#f3eefc] text-[#59287a] font-bold py-3 rounded-xl hover:bg-[#dccae8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
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

              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Price & Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold text-gray-700 mb-2">Price (RM)</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none" /></div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location</label>
                    <select value={locationSelection} onChange={(e) => setLocationSelection(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none bg-white mb-2">
                      <option>Desasiswa Restu</option><option>Desasiswa Saujana</option><option>Desasiswa Tekun</option><option>Desasiswa Aman Damai</option><option>Desasiswa Indah Kembara</option><option>Desasiswa Fajar Harapan</option><option>Desasiswa Bakti Permai</option><option>Desasiswa Cahaya Gemilang</option><option>Main Library</option><option value="Other">Other</option>
                    </select>
                    {locationSelection === "Other" && <input type="text" placeholder="Enter location..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} className="w-full p-3 rounded-xl border border-[#dccae8] bg-[#f3eefc] focus:ring-2 focus:ring-[#59287a] outline-none" />}
                  </div>
                </div>
              </div>

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