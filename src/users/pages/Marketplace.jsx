import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Heart, Plus, Loader2, ShoppingBag } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ["All", "Hostel Essentials", "Books", "Electronics", "Stationery", "Fashion & Accessories", "Others"];

const Marketplace = () => {
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
    // 1. Create the query (Get 'items' collection)
    // Note: If you get a "Missing Index" error in console, remove the orderBy part temporarily
    const itemsQuery = query(collection(db, "items"), orderBy("createdAt", "desc"));

    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setItems(itemsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items:", error);
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
    <div className="min-h-screen bg-[#5D2C75]/5 bg-[linear-gradient(to_right,#7db03815_1px,transparent_1px),linear-gradient(to_bottom,#7db03815_1px,transparent_1px)] [background-size:24px_24px] pb-20">


      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">

          {/* Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-black text-brand-darkText tracking-tighter flex items-center gap-2">
                <ShoppingBag className="text-brand-purple" size={28} />
                Marketplace
              </h1>
              <p className="text-sm text-gray-500 font-medium">Find great deals on campus</p>
            </div>
            <Link
              to="/sellitem"
              className="hidden md:flex bg-brand-purple hover:bg-purple-800 text-white px-6 py-2.5 rounded-full font-bold items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3} /> Sell Item
            </Link>

          </div>

          {/* Search Bar and Buttons */}
          <div className="flex gap-3">
            <div className="relative flex-grow group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-purple transition-colors" size={20} />
              <input
                type="text"
                placeholder="What are you looking for?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-100/50 focus:bg-white focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple outline-none transition-all shadow-inner"
              />
            </div>

            <button
              onClick={handleSearch}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-colors shadow-md"
            >
              Search
            </button>


          </div>

          {/* Categories */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat
                    ? "bg-brand-purple text-white border-brand-purple shadow-lg shadow-purple-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-brand-purple hover:text-brand-purple"
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
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-4 text-brand-purple" size={48} />
            <p className="font-medium">Loading amazing deals...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating Actions */}
                    <div
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-y-2 group-hover:translate-y-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle favorite action
                      }}
                    >
                      <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-all">
                        <Heart size={18} fill="currentColor" className="opacity-0 hover:opacity-100 absolute inset-0 m-auto" />
                        <Heart size={18} />
                      </button>
                    </div>

                    {/* Condition Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur-md text-brand-purple text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-purple-100">
                        {item.condition || "Used"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex flex-col gap-1 mb-3">
                      <h3 className="font-bold text-gray-900 text-[15px] line-clamp-2 leading-snug group-hover:text-brand-purple transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <MapPin size={12} />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between border-t border-gray-50 pt-3 mt-auto">
                      <p className="text-brand-purple font-black text-xl tracking-tight">RM {item.price}</p>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-brand-purple transition-colors bg-gray-50 group-hover:bg-purple-50 px-2 py-1 rounded-lg">
                        View
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-full shadow-lg mb-6 ring-4 ring-gray-50">
                  <Search size={40} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  We couldn't find matches for "{searchQuery}". Try a different category or search term.
                </p>
                <button
                  onClick={() => { setInputValue(""); setSearchQuery(""); setSelectedCategory("All"); }}
                  className="mt-6 text-brand-purple font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;