import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Heart, Plus, Loader2, Gift } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ["All", "Hostel Essentials", "Books", "Electronics", "Stationery", "Fashion & Accessories", "Others"];

const Donation = () => {
  const navigate = useNavigate();

  // State for Data
  const [items, setItems] = useState([]); // Stores the real list from Firebase
  const [loading, setLoading] = useState(true); // Shows spinner while loading

  // State for Filters
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- FETCH DATA FROM FIREBASE ---
  useEffect(() => {
    // 1. Create the query (Get 'donations' collection)
    const itemsQuery = query(collection(db, "donations"), orderBy("createdAt", "desc"));

    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setItems(itemsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching donations:", error);
      setLoading(false);
    });

    // 3. Cleanup listener when leaving page
    return () => unsubscribe();
  }, []);

  // Handle Search
  const handleSearch = () => {
    setSearchQuery(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // --- FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

    // Safety check: ensure title exists before lowercasing
    const title = item.title ? item.title.toLowerCase() : "";
    const matchesSearch = title.includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#9af71e]/5 bg-[linear-gradient(to_right,#7db03815_1px,transparent_1px),linear-gradient(to_bottom,#7db03815_1px,transparent_1px)] [background-size:24px_24px] pb-20">
      {/* Header Section */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-darkGreen-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4">

          {/* Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-black text-[#364f15] tracking-tighter flex items-center gap-2">
                <Gift className="text-[#7db038] animate-pulse" size={28} />
                Donation Corner
              </h1>
              <p className="text-sm text-[#7db038]/80 font-medium">Give what you don't need, take what you do.</p>
            </div>

          </div>

          {/* Search Bar and Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7db038] transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Search for free items"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#7db038]/20 bg-white focus:ring-4 focus:ring-[#7db038]/20 focus:border-[#7db038] outline-none transition-all shadow-sm text-[#364f15] placeholder:text-gray-400"
                />
              </div>

              <button
                onClick={handleSearch}
                className="bg-[#7db038] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#4a6b1d] transition-colors shadow-md"
              >
                Search
              </button>
            </div>

            {/* Donate Button */}
            <Link
              to="/donateitem"
              className="hidden md:flex bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95"            >
              <Plus size={20} /> Donate Item
            </Link>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat
                  ? "bg-[#7db038] text-white border-[#7db038] shadow-md shadow-[#7db038]/20"
                  : "bg-white text-gray-600 border-[#7db038]/20 hover:bg-[#7db038]/10 hover:border-[#7db038]/30"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ITEMS GRID */}
      <div className="max-w-7xl mx-auto px-4 mt-8">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#7db038]/50">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-medium">Loading community gifts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/donation/${item.id}`)}
                  className="group bg-white rounded-2xl border border-[#7db038] overflow-hidden hover:shadow-xl hover:shadow-[#7db038]/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer transform-gpu [mask-image:radial-gradient(white,black)]"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square bg-[#7db038]/5 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    <div
                      className="absolute top-3 right-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle favorite action
                      }}
                    >
                      <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100">
                        <Heart size={18} />
                      </button>
                    </div>

                    {/* FREE Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-[#7db038] text-white text-[10px] tracking-wider font-black px-3 py-1.5 rounded-full shadow-lg shadow-[#364f15]/20">
                        FREE
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex flex-col gap-1 mb-2">
                      <h3 className="font-bold text-[#1a260a] text-[15px] line-clamp-2 leading-snug group-hover:text-[#7db038] transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#7db038]/70 text-xs font-medium mt-1">
                        <MapPin size={12} />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#7db038]/10 flex justify-center">
                      <span className="text-xs font-bold text-orange-500 uppercase tracking-wide group-hover:underline">Click to view details</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-full shadow-lg shadow-[#7db038]/10 mb-6 ring-4 ring-[#7db038]/10">
                  <Gift size={40} className="text-[#7db038]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#364f15] mb-2">No donations found</h3>
                <p className="text-[#7db038]/70 max-w-xs mx-auto">
                  Be the first to donate an item and help the community!
                </p>
                <Link
                  to="/donateitem"
                  className="mt-6 inline-flex items-center gap-2 text-orange-500 font-bold hover:text-orange-600"
                >
                  <Plus size={18} /> Donate Now
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Donation;