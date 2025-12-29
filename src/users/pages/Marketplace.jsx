import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowUpDown } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ["All", "Hostel Essentials", "Books", "Electronics", "Stationery", "Fashion & Accessories", "Others"];

const Marketplace = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("newest"); // Options: 'newest', 'low', 'high'

  useEffect(() => {
    // Fetch all items, we'll hide sold ones on the client
    const itemsQuery = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = () => setSearchQuery(inputValue);
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const filteredItems = items
    // Hide items that have been sold
    .filter((item) => item.status === 'active')
    .filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const title = item.title ? item.title.toLowerCase() : "";
      const matchesSearch = title.includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Sorting logic
      if (sortOption === "low") {
        return a.price - b.price; // Low to High
      } else if (sortOption === "high") {
        return b.price - a.price; // High to Low
      } else {
        return 0; // Default (Newest)
      }
    });

  return (
    <div className="min-h-screen bg-[#5D2C75]/5 bg-[linear-gradient(to_right,#7db03815_1px,transparent_1px),linear-gradient(to_bottom,#7db03815_1px,transparent_1px)] [background-size:24px_24px] pb-20">

      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-3 mt-24">
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

            <div className="relative min-w-[160px]">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ArrowUpDown size={18} />
              </div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full pl-10 pr-8 py-3 appearance-none rounded-2xl border border-gray-200 bg-white hover:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple outline-none transition-all font-medium text-gray-700 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
              </select>
              {/* Custom Chevron Icon for Select */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <button onClick={handleSearch} className="bg-brand-purple text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-500 transition-colors shadow-md whitespace-nowrap">
              Search
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all border ${selectedCategory === cat ? "bg-brand-purple text-white border-brand-purple shadow-lg shadow-purple-200" : "bg-white text-gray-600 border-gray-200 hover:border-brand-purple hover:text-brand-purple"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
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
                <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-white/90 backdrop-blur-md text-brand-purple text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-purple-100">{item.condition || "Used"}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-col gap-1 mb-3">
                      <h3 className="font-bold text-gray-900 text-[15px] line-clamp-2 leading-snug group-hover:text-brand-purple transition-colors">{item.title}</h3>
                    </div>
                    <div className="flex items-end justify-between border-t border-gray-50 pt-3 mt-auto">
                      <p className="text-brand-purple font-black text-xl tracking-tight">RM {item.price}</p>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-brand-purple transition-colors bg-gray-50 group-hover:bg-purple-50 px-2 py-1 rounded-lg">View</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-full shadow-lg mb-6 ring-4 ring-gray-50"><Search size={40} className="text-gray-300" /></div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 max-w-xs mx-auto">We couldn't find matches for "{searchQuery}". Try a different category or search term.</p>
                <button onClick={() => { setInputValue(""); setSearchQuery(""); setSelectedCategory("All"); }} className="mt-6 text-brand-purple font-bold hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;