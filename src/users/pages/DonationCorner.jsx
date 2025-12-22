import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2, Gift } from 'lucide-react';

import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ["All", "Hostel Essentials", "Books", "Electronics", "Stationery", "Fashion & Accessories", "Others"];

const DonationCorner = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const itemsQuery = query(collection(db, "donations"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const itemsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => !item.receiverId);

      setItems(itemsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching donations:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = () => setSearchQuery(inputValue);
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const title = item.title ? item.title.toLowerCase() : "";
    const matchesSearch = title.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#9af71e]/5 bg-[linear-gradient(to_right,#7db03815_1px,transparent_1px),linear-gradient(to_bottom,#7db03815_1px,transparent_1px)] [background-size:24px_24px] pb-20">

      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#7db038]/20 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4">

          <div className="flex gap-3 mt-24">
            <div className="relative flex-grow group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7db038] transition-colors" size={20} />
              <input type="text" placeholder="Search for free items" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#7db038]/20 bg-white focus:ring-4 focus:ring-[#7db038]/20 focus:border-[#7db038] outline-none transition-all shadow-sm text-[#364f15] placeholder:text-gray-400" />
            </div>
            <button onClick={handleSearch} className="bg-[#7db038] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#4a6b1d] transition-colors shadow-md">Search</button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat ? "bg-[#7db038] text-white border-[#7db038] shadow-md shadow-[#7db038]/20" : "bg-white text-gray-600 border-[#7db038]/20 hover:bg-[#7db038]/10 hover:border-[#7db038]/30"}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

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
                <div key={item.id} onClick={() => navigate(`/donation/${item.id}`)} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-[#7db038]/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-[#7db038]/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-[#7db038]">{item.condition || "Used"}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-col gap-1 mb-3">
                      <h3 className="font-bold text-gray-900 text-[15px] line-clamp-2 leading-snug group-hover:text-[#7db038] transition-colors">{item.title}</h3>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><MapPin size={12} /><span className="truncate">{item.location}</span></div>
                    </div>
                    <div className="flex items-end justify-between border-t border-gray-50 pt-3 mt-auto">
                      <p className="text-[#7db038] font-black text-xl tracking-tight">FREE</p>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-[#7db038] transition-colors bg-gray-50 group-hover:bg-[#7db038]/10 px-2 py-1 rounded-lg">View</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-full shadow-lg shadow-[#7db038]/10 mb-6 ring-4 ring-[#7db038]/10"><Gift size={40} className="text-[#7db038]/40" /></div>
                <h3 className="text-xl font-bold text-[#364f15] mb-2">No donations found</h3>
                <p className="text-[#7db038]/70 max-w-xs mx-auto">No matches for "{searchQuery}".</p>
                <button onClick={() => { setInputValue(""); setSearchQuery(""); setSelectedCategory("All"); }} className="mt-6 text-[#7db038] font-bold hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationCorner;