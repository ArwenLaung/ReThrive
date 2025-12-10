import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X, Gift, Save } from 'lucide-react';
import { classifyImage } from '../../utils/aiImage';
import { generateDescription } from '../../utils/textGen';

// --- FIREBASE IMPORTS ---
import { db, storage, auth } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- STATE ---
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState(""); // Will be set from DB
  const [locationSelection, setLocationSelection] = useState(""); // Will be set from DB
  const [customLocation, setCustomLocation] = useState("");

  // Seller Details (Read-only for edit)
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");

  // Loading States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-defined Options (Must match SellItem exactly for UI consistency)
  const PREDEFINED_LOCATIONS = [
    "Desasiswa Restu", "Desasiswa Saujana", "Desasiswa Tekun", 
    "Desasiswa Aman Damai", "Desasiswa Indah Kembara", 
    "Desasiswa Fajar Harapan", "Desasiswa Bakti Permai", 
    "Desasiswa Cahaya Gemilang", "Main Library"
  ];

  // --- 1. FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          navigate('/login');
          return;
        }

        try {
          const docRef = doc(db, "items", id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            // Security Check
            if (data.sellerId !== user.uid) {
              alert("You can only edit your own items.");
              navigate('/mylistings');
              return;
            }

            // Populate State
            setTitle(data.title);
            setDescription(data.description);
            setPrice(data.price);
            setCategory(data.category);
            setCondition(data.condition);
            setSellerName(data.sellerName);
            setSellerEmail(data.sellerEmail);

            // Handle Images (Convert URLs to preview format expected by UI)
            if (data.images && Array.isArray(data.images)) {
              const formattedImages = data.images.map(url => ({
                file: null, // No file object for existing images
                preview: url,
                isExisting: true // Flag to know this doesn't need re-uploading
              }));
              setImages(formattedImages);
            }

            // Handle Location Logic
            if (PREDEFINED_LOCATIONS.includes(data.location)) {
              setLocationSelection(data.location);
            } else {
              setLocationSelection("Other");
              setCustomLocation(data.location);
            }

          } else {
            alert("Item not found");
            navigate('/mylistings');
          }
        } catch (error) {
          console.error("Error fetching item:", error);
        } finally {
          setIsLoadingData(false);
        }
      });
    };

    fetchData();
  }, [id, navigate]);

  // --- HANDLERS (Identical to SellItem) ---
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
      isExisting: false
    }));

    setImages((prev) => [...prev, ...newImages]);

    // AI Analysis Logic (Same as SellItem)
    if (newImages.length > 0) {
      const imgElement = document.createElement("img");
      imgElement.crossOrigin = "anonymous";
      imgElement.src = newImages[0].preview;

      imgElement.onload = async () => {
        try {
          const prediction = await classifyImage(imgElement);
          if (prediction && prediction.className) {
            setCategory(prediction.className);
          }
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
      // Use first image for context if available
      let imageDataUrl = null;
      if (images.length > 0) {
         // Note: Converting existing firebase URL to dataURL might face CORS issues
         // So this feature works best with newly uploaded images in Edit mode
      }
      
      const result = await generateDescription(keywords, category, imageDataUrl);
      setTitle(result.title);
      setDescription(result.description);
    } catch (error) {
      console.error("AI Text Error:", error);
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleUpdate = async () => {
    if (images.length === 0 || !title || !price || !category) {
      alert("Please fill in all required fields and ensure there is at least one image.");
      return;
    }

    const finalLocation = locationSelection === "Other" ? customLocation : locationSelection;
    if (!finalLocation.trim()) {
      alert("Please specify the location.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Process Images (Upload new ones, keep old ones)
      const finalImageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          // If it's an existing image from Firebase, just return the URL
          if (imgObj.isExisting) {
            return imgObj.preview;
          }
          
          // If it's a new file, upload it
          const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const timestamp = Date.now();
          const storageRef = ref(storage, `items/${timestamp}_${index}_${cleanName}`);
          const snapshot = await uploadBytes(storageRef, imgObj.file);
          return await getDownloadURL(snapshot.ref);
        })
      );

      // 2. Update Firestore
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category: category,
        location: finalLocation.trim(),
        condition: condition,
        images: finalImageUrls,
        image: finalImageUrls[0], // Update main thumbnail
        updatedAt: serverTimestamp(),
      });

      alert("Listing updated successfully!");
      navigate('/mylistings');

    } catch (error) {
      console.error("Error updating:", error);
      alert("Failed to update listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#59287a]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/mylistings" className="text-gray-600 hover:text-[#59287a] transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

          {/* Upload Photos Section */}
          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Photos (Max 3)
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

          {/* Details & Form Section */}
          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 h-full">

              {/* Item Details */}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords for AI (Optional Update)</label>
                    <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Type new keywords to regenerate title/description..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none h-24 resize-none" />

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

              {/* Seller Information (Read Only) */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Your Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={e => setSellerName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email / Contact</label>
                    <input
                      type="text"
                      value={sellerEmail}
                      onChange={e => setSellerEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Price & Location */}
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
                      {PREDEFINED_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      <option value="Other">Other (Please enter)</option>
                    </select>
                    {locationSelection === "Other" && (
                      <input type="text" placeholder="Enter specific location..." value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} className="w-full p-3 rounded-xl border border-[#dccae8] bg-[#f3eefc] focus:ring-2 focus:ring-[#59287a] outline-none" />
                    )}
                  </div>
                </div>
              </div>

              {/* UPDATE BUTTON */}
              <div className="pt-4 mt-auto">
                <button onClick={handleUpdate} disabled={isSubmitting} className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="animate-spin" /> Updating...</> : <><Save size={20} /> Update Listing</>}
                </button>
              </div>

            </section>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ListingDetail;