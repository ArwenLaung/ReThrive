import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X, Gift, CheckCircle2, MapPin, Tag } from 'lucide-react';
import { classifyImage } from '../../utils/aiImage';
import { generateDescription } from '../../utils/textGen';
import { db, storage, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

// Helper to convert file to Base64 (Required for Gemini Vision)
const fileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const AVAILABILITY_DAYS = ['Weekdays (Mon-Fri)', 'Weekends (Sat-Sun)', 'Flexible'];
const AVAILABILITY_SLOTS = ['Morning (8am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (After 6pm)'];

const DonateItem = () => {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("Lightly Used");
  const [locations, setLocations] = useState([]);
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherLocation, setOtherLocation] = useState("");
  const [availDays, setAvailDays] = useState([]);
  const [availSlots, setAvailSlots] = useState([]);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorId, setDonorId] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [postedDonation, setPostedDonation] = useState(null);

  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unsafeKeywords, setUnsafeKeywords] = useState([]);

  // Fallback list (Only used if Firebase fails)
  const DEFAULT_BANNED_WORDS = [
    "gun", "knife", "drug", "alcohol", "beer", "broken", "poker", "gambling",
    "medicine", "pill", "tablet", "capsule", "vitamin", "panadol", "antibiotic",
    "cigarette", "vape", "tobacco", "smoke", "wine", "vodka", "liquor"
  ];
  const FORBIDDEN_CLASSES = ["Weapon / Dangerous Item", "Restricted Item"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setDonorId(user.uid);
        setDonorName(user.displayName || user.email || "");
        setDonorEmail(user.email || "");
      }
    });

    // Fetch banned keywords from Firebase
    const fetchKeywords = async () => {
      try {
        const docRef = doc(db, "settings", "moderation");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().bannedKeywords) {
          const rawList = docSnap.data().bannedKeywords;

          const cleanList = rawList
            .map(word => word.toString().replace(/['"]+/g, '').toLowerCase().trim())
            .filter(word => word.length > 0);

          if (cleanList.length > 0) {
            setUnsafeKeywords(cleanList);
            console.log("Loaded Banned Words:", cleanList);
          } else {
            setUnsafeKeywords(DEFAULT_BANNED_WORDS);
          }
        } else {
          setUnsafeKeywords(DEFAULT_BANNED_WORDS);
        }
      } catch (error) {
        console.error("Error fetching keywords (Check Firestore Rules!):", error);
        setUnsafeKeywords(DEFAULT_BANNED_WORDS);
      }
    };

    fetchKeywords();
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
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    const firstImgUrl = newImages[0].preview;
    const imgElement = document.createElement("img");
    imgElement.crossOrigin = "anonymous";
    imgElement.src = firstImgUrl;

    imgElement.onload = async () => {
      try {
        const prediction = await classifyImage(imgElement);

        // Block if forbidden class detected with high confidence
        if (FORBIDDEN_CLASSES.includes(prediction?.className) && prediction?.probability > 0.8) {
          alert(`Donation Blocked: The system identified this as a '${prediction.className}'. To maintain a safe campus environment, this item cannot be listed.`);
          setIsAnalyzingImage(false);
          return; // Stop execution
        }

        setImages(prev => [...prev, ...newImages]);
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

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateText = async () => {
    if (!keywords.trim() || !category) {
      alert("Please select a category and add some keywords.");
      return;
    }
    // Check for unsafe keywords before generating
    const foundKeyword = unsafeKeywords.find(word => keywords.toLowerCase().includes(word));

    if (foundKeyword) {
      alert(`Generation Blocked: Your input contains the restricted word "${foundKeyword}". Please remove prohibited keywords.`);
      return; // Stop execution
    }
    setIsGeneratingText(true);
    try {
      let imageDataUrl = null;
      // Convert raw file to Base64 so AI can detect inappropriate items visually
      if (images.length > 0) {
        imageDataUrl = await fileToDataURL(images[0].file);
      }
      const result = await generateDescription(keywords, category, imageDataUrl);
      if (result.title === "Restricted Item" || result.title.includes("Violation")) {
        alert(`Safety Restriction: ${result.description}`);
        setTitle("");
        setDescription("");
        return;
      }
      setTitle(result.title);
      setDescription(result.description);
    } catch (error) {
      console.error("Error generating text:", error);
      alert("AI Generation failed. Please try again.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleDonate = async () => {
    if (images.length === 0 || !title || !category) {
      alert("Please fill in all required fields and upload at least one image.");
      return;
    }
    const finalLocations = [...locations];
    if (otherChecked && otherLocation && otherLocation.trim()) finalLocations.push(otherLocation.trim());

    if (finalLocations.length === 0) {
      alert("Please select at least one pickup location.");
      return;
    }
    const finalLocation = finalLocations[0];

    if (availDays.length === 0 || availSlots.length === 0) {
      alert("Please select your availability (Days and Time slots).");
      return;
    }

    // Keyword block using list from firebase
    const combinedText = (title + " " + description).toLowerCase();
    console.log("--- DONATION CHECK START ---");
    console.log("Checking Text:", combinedText);
    console.log("Using Banned List:", unsafeKeywords);
    // Check if any keyword in the array is present in the text
    const foundKeyword = unsafeKeywords.find(word => combinedText.includes(word.toLowerCase()));

    if (foundKeyword) {
      // Direct block logic
      alert(`Donation Blocked: Your description contains the restricted word "${foundKeyword}". Please remove prohibited keywords to proceed.`);
      return; // Stop execution immediately. Do not upload.
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
          const storageRef = ref(storage, `donations/${Date.now()}_${index}_${cleanName}`);
          const snapshot = await uploadBytes(storageRef, imgObj.file);
          return await getDownloadURL(snapshot.ref);
        })
      );

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: finalLocation,
        locations: finalLocations,
        availabilityDays: availDays,
        availabilitySlots: availSlots,
        condition,
        images: imageUrls,
        image: imageUrls[0],
        donorId: donorId || (currentUser ? currentUser.uid : null),
        donorName: donorName || (currentUser ? (currentUser.displayName || "USM Student") : ""),
        donorEmail: donorEmail || (currentUser ? currentUser.email : null),
        createdAt: serverTimestamp(),
        status: "active",
      };

      const docRef = await addDoc(collection(db, "donations"), payload);

      // Show success screen with only the newly posted donation
      setPostedDonation({ id: docRef.id, ...payload });
      setShowSuccess(true);
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to post donation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccess(false);
    setPostedDonation(null);
    navigate("/donation");
  };

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-20 relative">
      <div className="bg-white/90 backdrop-blur-md px-4 py-4 shadow-sm sticky top-0 z-10 border-b border-[#7db038]/20">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/donation" className="text-gray-600 hover:text-[#7db038] transition-colors"><ArrowLeft size={24} /></Link>
          <h1 className="text-xl font-bold text-[#364f15]">Donate an Item</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

          <div className="md:col-span-4 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#7db038]/20 sticky top-24 h-full flex flex-col">
              <h2 className="text-lg font-bold text-[#364f15] mb-4">Upload Donation Photos (Max 3)</h2>
              <div className="grid grid-cols-2 gap-3 flex-grow content-start">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#7db038]/20 group">
                    <img src={img.preview} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"><X size={16} /></button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-[#7db038]/40 rounded-2xl cursor-pointer bg-[#7db038]/5 hover:bg-[#7db038]/10 text-[#7db038]">
                    {isAnalyzingImage ? <Loader2 className="animate-spin text-[#7db038]" /> : <><Upload size={24} /><span className="text-xs font-bold mt-2">Add Photo</span></>}
                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" multiple />
                  </label>
                )}
              </div>
            </section>
          </div>

          <div className="md:col-span-8 flex flex-col">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#7db038]/20 space-y-6 h-full">

              <div>
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Donation Details</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#7db038] focus:ring-2 focus:ring-[#7db038]/20 outline-none bg-white">
                        <option value="" disabled>Select category...</option>
                        <option>Hostel Essentials</option><option>Electronics</option><option>Books</option><option>Stationery</option><option>Fashion & Accessories</option><option>Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">Condition</label>
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
                    <label className="block text-sm font-semibold text-gray-600 mb-2">Keywords for AI</label>
                    <textarea value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. Science textbook, good condition" className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#7db038] focus:ring-2 focus:ring-[#7db038]/20 outline-none h-24 resize-none" />
                    <button onClick={handleGenerateText} disabled={isGeneratingText || !keywords} className="mt-3 w-full bg-[#7db038]/10 text-[#364f15] font-bold py-3 rounded-xl hover:bg-[#7db038]/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {isGeneratingText ? "Writing..." : "Auto-Generate Title & Description"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div><label className="block text-sm font-semibold text-gray-600 mb-2">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#7db038] focus:ring-2 focus:ring-[#7db038]/20 outline-none font-bold text-gray-800" /></div>
                    <div><label className="block text-sm font-semibold text-gray-600 mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#7db038] focus:ring-2 focus:ring-[#7db038]/20 outline-none h-32" /></div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Pickup & Availability</h2>
                <div className="space-y-6">

                  {/* Location Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location(s)</label>
                    <div className="grid grid-cols-1 gap-2 border p-3 rounded-xl border-gray-100 max-h-40 overflow-y-auto">
                      {[
                        'Desasiswa Restu', 'Desasiswa Saujana', 'Desasiswa Tekun',
                        'Desasiswa Aman Damai', 'Desasiswa Indah Kembara', 'Desasiswa Fajar Harapan',
                        'Desasiswa Bakti Permai', 'Desasiswa Cahaya Gemilang', 'Main Library'
                      ].map((opt) => (
                        <label key={opt} className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={locations.includes(opt)} onChange={() => {
                            setLocations((prev) => prev.includes(opt) ? prev.filter((p) => p !== opt) : [...prev, opt]);
                          }} className="rounded text-[#7db038] focus:ring-[#7db038]" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={otherChecked} onChange={() => setOtherChecked((v) => !v)} className="rounded text-[#7db038] focus:ring-[#7db038]" />
                        <span className="text-sm">Other</span>
                      </label>
                    </div>
                    {otherChecked && (
                      <input type="text" placeholder="Enter other location..." value={otherLocation} onChange={(e) => setOtherLocation(e.target.value)} className="w-full mt-2 p-2 rounded-lg border border-[#7db038]/30 bg-[#7db038]/5 text-sm outline-none focus:border-[#7db038]" />
                    )}
                  </div>

                  {/* Availability Section */}
                  <div className="bg-[#7db038]/5 p-4 rounded-xl border border-[#7db038]/20">
                    <h3 className="text-sm font-bold text-[#364f15] mb-3">When are you available to meet?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Days */}
                      <div>
                        <label className="block text-xs font-bold text-[#7db038] uppercase tracking-wider mb-2">Days</label>
                        <div className="space-y-2">
                          {AVAILABILITY_DAYS.map((day) => (
                            <label key={day} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={availDays.includes(day)} onChange={() => {
                                setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                              }} className="rounded text-[#7db038] focus:ring-[#7db038]" />
                              <span className="text-sm text-gray-700">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {/* Slots */}
                      <div>
                        <label className="block text-xs font-bold text-[#7db038] uppercase tracking-wider mb-2">Time Slots</label>
                        <div className="space-y-2">
                          {AVAILABILITY_SLOTS.map((slot) => (
                            <label key={slot} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={availSlots.includes(slot)} onChange={() => {
                                setAvailSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
                              }} className="rounded text-[#7db038] focus:ring-[#7db038]" />
                              <span className="text-sm text-gray-700">{slot}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="pt-4 mt-auto">
                <button onClick={handleDonate} disabled={isSubmitting} className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-transform active:scale-95 text-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="animate-spin" /> Posting...</> : <><Gift /> Post Donation Now</>}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* SUCCESS OVERLAY */}
      {showSuccess && postedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600 w-8 h-8" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Donation Posted Successfully</h2>
              <p className="text-sm text-gray-600">
                Thank you for giving! Here’s a quick preview of your donated item.
              </p>
            </div>

            <div className="border border-[#7db038]/30 rounded-2xl overflow-hidden bg-[#7db038]/5">
              {postedDonation.image && (
                <div className="aspect-video w-full overflow-hidden bg-gray-100">
                  <img
                    src={postedDonation.image}
                    alt={postedDonation.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className="text-sm font-semibold text-[#364f15] line-clamp-2">
                  {postedDonation.title}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#7db038] px-3 py-1 rounded-full">
                  <Gift size={14} />
                  FREE ITEM
                </span>
                <div className="flex items-center gap-2 text-xs text-[#364f15] mt-1">
                  <MapPin size={14} className="text-[#7db038]" />
                  <span className="truncate">{postedDonation.location}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSuccessOk}
              className="w-full bg-[#7db038] text-white font-bold py-3 rounded-2xl shadow-md hover:bg-[#4a6b1d] active:scale-95 transition-transform"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonateItem;