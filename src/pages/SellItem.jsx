import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react'; // Removed Sparkles
import { classifyImage } from '../utils/aiImage';
import { generateDescription } from '../utils/textGen';

// --- FIREBASE IMPORTS ---
import { db, storage, auth } from '../firebase';
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
  const [condition, setCondition] = useState("Good (Used, but well maintained)");
  const [locationSelection, setLocationSelection] = useState("Desasiswa Restu");
  const [customLocation, setCustomLocation] = useState("");

  // Loading States
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // User state (optional - for seller info)
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get current user if authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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

  const handlePostItem = async () => {
    // Validation
    if (images.length === 0 || !title || !price || !category) {
      alert("Please fill in all required fields and upload at least one image.");
      return;
    }

    const finalLocation = locationSelection === "Other" ? customLocation : locationSelection;
    if (!finalLocation.trim()) {
      alert("Please specify the location.");
      return;
    }

    // Validate price
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price greater than 0.");
      return;
    }

    setIsSubmitting(true);

    // Add timeout to prevent infinite loading (30 seconds)
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      alert("Request timed out. Please check your internet connection and Firebase configuration, then try again.");
      console.error("Posting timeout after 30 seconds");
    }, 30000);

    try {
      console.log("Starting item post process...");
      console.log("Form data:", { title, price, category, location: finalLocation, imagesCount: images.length });
      
      // Step 1: Upload images to Firebase Storage
      console.log("Uploading images to Firebase Storage...");
      const imageUrls = await Promise.all(
        images.map(async (imgObj, index) => {
          try {
            const cleanName = imgObj.file.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const timestamp = Date.now();
            const storageRef = ref(storage, `items/${timestamp}_${index}_${cleanName}`);
            
            console.log(`Uploading image ${index + 1}/${images.length}...`);
            const snapshot = await uploadBytes(storageRef, imgObj.file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log(`Image ${index + 1} uploaded successfully`);
            return downloadURL;
          } catch (uploadError) {
            console.error(`Upload failed for image ${index + 1}:`, uploadError);
            // Don't use placeholder - fail the entire operation
            throw new Error(`Failed to upload image ${index + 1}: ${uploadError.message}`);
          }
        })
      );

      if (imageUrls.length === 0) {
        throw new Error("No images were uploaded successfully.");
      }

      // Step 2: Prepare item data
      const itemData = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        category: category,
        location: finalLocation.trim(),
        condition: condition,
        images: imageUrls,
        image: imageUrls[0], // Primary image for listing
        createdAt: serverTimestamp(),
        status: "active", // Default status
        // Seller information - will be autofilled from logged-in user
        // PLACEHOLDER: userName - will be autofilled from currentUser.displayName or currentUser.email
        // PLACEHOLDER: userID - will be autofilled from currentUser.uid
        // PLACEHOLDER: userEmail - will be autofilled from currentUser.email
        // Add seller information if user is authenticated
        ...(currentUser && {
          sellerId: currentUser.uid, // userID placeholder
          sellerName: currentUser.displayName || currentUser.email || "Anonymous", // userName placeholder
          sellerEmail: currentUser.email || null, // userEmail placeholder
        }),
      };

      // Step 3: Save to Firestore
      console.log("Saving item to Firestore...");
      const docRef = await addDoc(collection(db, "items"), itemData);
      console.log("Item posted successfully with ID:", docRef.id);

      alert("Success! Your item has been posted to the Marketplace.");
      
      // Clear form
      setImages([]);
      setCategory("");
      setKeywords("");
      setTitle("");
      setDescription("");
      setPrice("");
      setCondition("Good (Used, but well maintained)");
      setLocationSelection("Desasiswa Restu");
      setCustomLocation("");
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      
      // Navigate to marketplace
      navigate('/marketplace');

    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      console.error("Error posting item:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to post item. ";
      
      if (error.code === 'permission-denied') {
        errorMessage += "You don't have permission to post items. Please check your Firebase security rules.";
      } else if (error.code === 'unavailable') {
        errorMessage += "Firebase service is temporarily unavailable. Please try again later.";
      } else if (error.code === 'storage/unauthorized') {
        errorMessage += "Storage permission denied. Please check your Firebase Storage rules.";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage += "Storage quota exceeded. Please contact administrator.";
      } else if (error.message && error.message.includes('upload')) {
        errorMessage += `Image upload failed: ${error.message}`;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "An unexpected error occurred. Please check the browser console (F12) for details.";
      }
      
      alert(errorMessage);
      setIsSubmitting(false); // Stop loading on error
    } finally {
      clearTimeout(timeoutId); // Clear timeout in finally too
      setIsSubmitting(false); // Ensure loading stops
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