import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Heart, Plus, Loader2 } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ["All", "Hostel Essentials", "Books", "Electronics", "Stationery", "Fashion & Accessories", "Others"];

const Marketplace = () => {
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
    <div className="min-h-screen bg-white pb-20">
      
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          
          {/* Title */}
          <div className="mb-4">
            <h1 className="text-2xl font-black text-brand-darkText tracking-tight">Marketplace</h1>
          </div>

          {/* Search Bar and Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search for an item" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple outline-none transition-all"
                />
              </div>
              
              <button 
                onClick={handleSearch}
                className="bg-brand-purple text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-800 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>

            {/* Sell Button */}
            <Link 
              to="/sell" 
              className="bg-brand-green hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} /> Sell Item
            </Link>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat 
                    ? "bg-brand-purple text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ITEMS GRID */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={40} />
            <p>Loading items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div key={item.id} className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <button className="p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-500 hover:text-red-500 transition-colors shadow-sm">
                        <Heart size={16} />
                      </button>
                    </div>
                    {/* Condition Badge */}
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
                      {item.condition || "Used"}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug group-hover:text-brand-purple transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-brand-purple font-bold text-lg">RM {item.price}</p>
                      
                      <div className="flex items-center gap-1 mt-2 text-gray-400 text-xs">
                         <MapPin size={12} />
                         <span className="truncate">{item.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Search size={32} className="opacity-40" />
                </div>
                <p className="text-lg font-medium text-gray-500">No results found</p>
                <p className="text-sm">Try searching for something else</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;