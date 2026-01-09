import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X, Save, Tag, AlertCircle, MapPin, Ban } from 'lucide-react';
import { classifyImage } from '../../utils/aiImage';
import { generateDescription } from '../../utils/textGen';
import { db, storage, auth } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const AVAILABILITY_DAYS = ['Weekdays (Mon-Fri)', 'Weekends (Sat-Sun)', 'Flexible'];
const AVAILABILITY_SLOTS = ['Morning (8am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (After 6pm)'];
const FORBIDDEN_CLASSES = ["Weapon / Dangerous Item", "Restricted Item"];

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // STATE
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [locations, setLocations] = useState([]);
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherLocation, setOtherLocation] = useState("");
  const [availDays, setAvailDays] = useState([]);
  const [availSlots, setAvailSlots] = useState([]);
  const [unsafeKeywords, setUnsafeKeywords] = useState([]);

  // Seller Details
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");

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

  // Map old data to new dropdown options if necessary
  const CONDITION_MAP = {
    "Good (Used, but well maintained)": "Lightly Used",
    "Fair (Visible signs of use)": "Well Used",
    "Good": "Lightly Used",
    "Fair": "Well Used"
  };

  // Fetch unsafe keywords for moderation
  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const docRef = doc(db, "settings", "moderation");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().bannedKeywords) {
          const list = docSnap.data().bannedKeywords.map(w => w.toLowerCase().trim());
          setUnsafeKeywords(list);
        }
      } catch (e) { console.error("Error loading moderation list:", e); }
    };
    fetchKeywords();
  }, []);

  // 1. FETCH DATA
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          if (data.sellerId && data.sellerId !== user.uid) {
            setIsUnauthorized(true);
            setTimeout(() => navigate('/mylistings'), 3000);
            return;
          }

          // Populate Form
          setTitle(data.title);
          setDescription(data.description);
          setPrice(data.price);
          setCategory(data.category);
          setSellerName(data.sellerName || "");
          setSellerEmail(data.sellerEmail || "");

          // Map Condition
          const normalizedCondition = CONDITION_MAP[data.condition] || data.condition;
          setCondition(normalizedCondition);
          setAvailDays(data.availabilityDays || []);
          setAvailSlots(data.availabilitySlots || []);

          // Handle Images
          if (data.images && Array.isArray(data.images)) {
            const formattedImages = data.images.map(url => ({
              file: null,
              preview: url,
              isExisting: true
            }));
            setImages(formattedImages);
          }

          // Handle Location
          const savedLocations = data.locations || (data.location ? [data.location] : []);

          const standardLocs = savedLocations.filter(l => PREDEFINED_LOCATIONS.includes(l));
          const customLoc = savedLocations.find(l => !PREDEFINED_LOCATIONS.includes(l));

          setLocations(standardLocs);
          if (customLoc) {
            setOtherChecked(true);
            setOtherLocation(customLoc);
          }

        } else {
          // Only redirect if explicitly not found
          setError("Item not found");
          // setTimeout(() => navigate('/mylistings'), 2000); 
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        setError("Failed to load item.");
      } finally {
        setIsLoadingData(false);
      }
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // 2. HANDLERS
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

    const firstImgUrl = newImages[0].preview;
    const imgElement = document.createElement("img");
    imgElement.crossOrigin = "anonymous";
    imgElement.src = firstImgUrl;

    imgElement.onload = async () => {
      try {
        const prediction = await classifyImage(imgElement);

        // AI BLOCK: Check if forbidden
        if (FORBIDDEN_CLASSES.includes(prediction?.className) && prediction?.probability > 0.8) {
          alert(`Listing Blocked: Identified as '${prediction.className}'.`);
          setIsAnalyzingImage(false);
          return; // Stop execution
        }

        setImages((prev) => [...prev, ...newImages]);
        // Auto-set category if valid
        if (prediction?.className && !FORBIDDEN_CLASSES.includes(prediction.className)) {
          setCategory(prediction.className);
        }
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setIsAnalyzingImage(false);
      }
    };
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handleGenerateText = async () => {
    if (!keywords.trim() || !category) {
      alert("Select category & add keywords first."); return;
    }

    // Check Keywords before generating
    const foundKeyword = unsafeKeywords.find(word => keywords.toLowerCase().includes(word));
    if (foundKeyword) {
      alert(`Blocked: Contains restricted word "${foundKeyword}".`);
      return;
    }

    setIsGeneratingText(true);
    try {
      const result = await generateDescription(keywords, category, null);

      // Check result title for violation flags from AI
      if (result.title.includes("Violation")) {
        alert("Safety Restriction: " + result.description);
        return;
      }

      setTitle(result.title);
      setDescription(result.description);
    } catch (e) { console.error(e); }
    finally { setIsGeneratingText(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (images.length === 0 || !title || !price || !category) {
      setError("Please fill in all required fields."); return;
    }
    if (!sellerName.trim()) { setError("Name required."); return; }

    const finalLocations = [...locations];
    if (otherChecked && otherLocation.trim()) {
      finalLocations.push(otherLocation.trim());
    }

    if (finalLocations.length === 0) {
      setError("Please select at least one pickup location."); return;
    }
    const primaryLocation = finalLocations[0];

    // Validate Availability & Perform Final Moderation Check
    if (availDays.length === 0 || availSlots.length === 0) {
      setError("Please select availability days and slots."); return;
    }

    const combinedText = (title + " " + description).toLowerCase();
    const foundKeyword = unsafeKeywords.find(word => combinedText.includes(word));
    if (foundKeyword) {
      alert(`Update Blocked: Description contains "${foundKeyword}".`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 1. Process Images with better error handling
      const finalImageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          if (imgObj.isExisting) return imgObj.preview;

          try {
            const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const storageRef = ref(storage, `items/${Date.now()}_${index}_${cleanName}`);
            const snapshot = await uploadBytes(storageRef, imgObj.file);
            return await getDownloadURL(snapshot.ref);
          } catch (uploadErr) {
            console.error("Image upload failed:", uploadErr);
            throw new Error("Failed to upload image. Please check your connection or image size.");
          }
        })
      );

      // 2. Verify all images have URLs
      if (finalImageUrls.some(url => !url)) {
        throw new Error("One or more images failed to upload.");
      }

      // 3. Update Database
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        location: primaryLocation,
        locations: finalLocations,
        condition,
        availabilityDays: availDays,
        availabilitySlots: availSlots,
        images: finalImageUrls,
        image: finalImageUrls[0],
        sellerName: sellerName.trim(),
        sellerEmail: sellerEmail.trim(),
        updatedAt: serverTimestamp(),
      });

      alert("Listing updated successfully!");
      navigate('/mylistings');
    } catch (err) {
      console.error("Error updating:", err);
      // More specific error message
      if (err.message.includes("permission")) {
        setError("Permission denied. You may not be allowed to edit this.");
      } else if (err.message.includes("upload")) {
        setError(err.message);
      } else {
        setError("Failed to update listing. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#59287a]" size={40} /></div>;
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-4">
          <Ban className="text-red-500 w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <button onClick={() => navigate('/mylistings')} className="bg-[#59287a] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#451d5e] transition-colors">
          Back to My Listings
        </button>
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
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
            <AlertCircle size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

          {/* LEFT COLUMN: Photos (Sticky) */}
          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Items Photos (Max 3)</h2>
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
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} ref={fileInputRef} />
                  </label>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Details Form */}
          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 h-full">

              {/* Item Details */}
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Keywords for AI (Optional)</label>
                    <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Type new keywords to regenerate title/description..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none h-24 resize-none" />
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

              {/* Your Details (Editable) */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Your Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                    <input type="text" value={sellerName} onChange={e => setSellerName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email / Contact</label>
                    <input type="text" value={sellerEmail} onChange={e => setSellerEmail(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none" />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Price and Logistics */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Price & Logistics</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Price (RM)</label>
                      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#59287a] outline-none" />
                    </div>
                    {/* Pickup Location Selection (Matches SellItem) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location(s)</label>
                      <div className="grid grid-cols-1 gap-2 border p-3 rounded-xl border-gray-100 max-h-40 overflow-y-auto">
                        {PREDEFINED_LOCATIONS.map((opt) => (
                          <label key={opt} className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={locations.includes(opt)} onChange={() => {
                              setLocations((prev) => prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]);
                            }} className="rounded text-[#59287a] focus:ring-[#59287a]" />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={otherChecked} onChange={() => setOtherChecked((v) => !v)} className="rounded text-[#59287a]" />
                          <span className="text-sm">Other</span>
                        </label>
                      </div>
                      {otherChecked && (
                        <input type="text" placeholder="Enter other location..." value={otherLocation} onChange={(e) => setOtherLocation(e.target.value)} className="w-full mt-2 p-2 rounded-lg border border-[#dccae8] bg-[#f3eefc] text-sm" />
                      )}
                    </div>
                  </div>

                  {/* Availability Section (Matches SellItem) */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">When are you available to meet?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Days */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Days</label>
                        <div className="space-y-2">
                          {AVAILABILITY_DAYS.map((day) => (
                            <label key={day} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={availDays.includes(day)} onChange={() => {
                                setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                              }} className="rounded text-[#59287a]" />
                              <span className="text-sm text-gray-700">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {/* Slots */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time Slots</label>
                        <div className="space-y-2">
                          {AVAILABILITY_SLOTS.map((slot) => (
                            <label key={slot} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={availSlots.includes(slot)} onChange={() => {
                                setAvailSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
                              }} className="rounded text-[#59287a]" />
                              <span className="text-sm text-gray-700">{slot}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPDATE BUTTON */}
              <div className="pt-4 mt-auto">
                <button onClick={handleUpdate} disabled={isSubmitting} className="w-full bg-[#59287a] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#451d5e] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="animate-spin" size={24} /> Updating...</> : <><Save size={20} /> Update Listing</>}
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