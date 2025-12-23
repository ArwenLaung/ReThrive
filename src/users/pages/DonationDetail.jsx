import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2, Gift, User, Mail, CheckCircle, Calendar, Clock, ShoppingBag } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';

const DonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const itemDoc = await getDoc(doc(db, 'donations', id));
        if (itemDoc.exists()) setItem({ id: itemDoc.id, ...itemDoc.data() });
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    if (id) fetchItem();
  }, [id]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!item || !item.category) return;

      try {
        // Query donations with same category
        const q = query(
          collection(db, "donations"),
          where("category", "==", item.category),
          //where("status", "==", "active"),
          limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        const items = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Exclude current item AND claimed items
          if (doc.id !== item.id && !data.receiverId) {
            items.push({ id: doc.id, ...data });
          }
        });

        setRelatedItems(items.slice(0, 4));
      } catch (error) {
        console.error("Error fetching related donations:", error);
      }
    };

    if (item) {
      fetchRelated();
    }
  }, [item]);

  const handleClaim = () => {
    navigate(`/claimdonation/${id}`);
  };

  if (loading) return <div className="min-h-screen bg-[#9af71e]/5 flex items-center justify-center"><Loader2 className="animate-spin text-[#7db038]" size={48} /></div>;
  if (!item) return <div className="min-h-screen bg-[#9af71e]/5"><main className="max-w-3xl mx-auto px-4 py-16 text-center"><p className="text-2xl font-semibold text-[#364f15] mb-6">Donation not found.</p><Link to="/donation" className="text-[#7db038] font-semibold"><ArrowLeft size={18} /> Back</Link></main></div>;

  const images = item.images || (item.image ? [item.image] : []);

  return (
    <div className="min-h-screen bg-[#9af71e]/5 pb-20">
      <div className="bg-white/90 backdrop-blur-md border-b border-[#7db038]/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/donation" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#7db038] transition-colors"><ArrowLeft size={20} /> Back to Donation Corner</Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-[#7db038]/20 shadow-lg">
              <img src={images[currentImageIndex]} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                 <span className="bg-[#7db038] text-white text-sm font-black px-4 py-2 rounded-full shadow-lg">{item.condition || "Used"}</span>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(p => p > 0 ? p - 1 : images.length - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg"><ArrowLeft size={20} /></button>
                  <button onClick={() => setCurrentImageIndex(p => p < images.length - 1 ? p + 1 : 0)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg rotate-180"><ArrowLeft size={20} /></button>
                </>
              )}
            </div>
            {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-2">{images.map((img, idx) => <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${currentImageIndex === idx ? 'border-[#7db038]' : 'border-[#7db038]/20'}`}><img src={img} className="w-full h-full object-cover" /></button>)}</div>}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black text-[#364f15] mb-2">{item.title}</h1>
              <p className="text-4xl font-black text-[#7db038]">FREE</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#7db038]/20 shadow-sm">
              <h2 className="text-lg font-bold text-[#364f15] mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#7db038]/20 shadow-sm">
                <h2 className="text-lg font-bold text-[#364f15] mb-6 flex items-center gap-2">
                   <MapPin className="text-[#7db038]" size={20} />
                   Meetup & Availability
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* COLUMN 1: Locations */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#7db038]">
                            <MapPin size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Locations</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-2 text-gray-700 text-sm font-medium">
                            {(item.locations && item.locations.length > 0) ? (
                              item.locations.map((loc, idx) => (
                                <li key={idx} className="leading-tight">{loc}</li>
                              ))
                            ) : (
                                <li className="leading-tight">{item.location || 'Location not specified'}</li>
                            )}
                        </ul>
                    </div>

                    {/* COLUMN 2: Preferred Days */}
                    <div className="space-y-3 md:border-l md:border-gray-100 md:pl-6">
                        <div className="flex items-center gap-2 text-[#7db038]">
                            <Calendar size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Preferred Days</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-2 text-gray-700 text-sm font-medium">
                            {item.availabilityDays && item.availabilityDays.length > 0 ? (
                                item.availabilityDays.map(d => (
                                    <li key={d}>{d}</li>
                                ))
                            ) : (
                                <li>Flexible</li>
                            )}
                        </ul>
                    </div>

                    {/* COLUMN 3: Time Slots */}
                    <div className="space-y-3 md:border-l md:border-gray-100 md:pl-6">
                        <div className="flex items-center gap-2 text-[#7db038]">
                            <Clock size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Time Slots</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-2 text-gray-700 text-sm font-medium">
                            {item.availabilitySlots && item.availabilitySlots.length > 0 ? (
                                item.availabilitySlots.map(s => (
                                    <li key={s}>{s}</li>
                                ))
                            ) : (
                                <li>Flexible</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {(item.donorName || item.donorEmail) && (
              <div className="bg-white rounded-2xl p-6 border border-[#7db038]/20 shadow-sm">
                <h2 className="text-lg font-bold text-[#364f15] mb-4">Donor Information</h2>
                <div className="space-y-3">
                  {item.donorName && <div className="flex items-center gap-3"><User size={18} className="text-[#7db038]" /><span className="text-gray-700">{item.donorName}</span></div>}
                  {item.donorEmail && <div className="flex items-center gap-3"><Mail size={18} className="text-[#7db038]" /><span className="text-[#7db038]">{item.donorEmail}</span></div>}
                </div>
              </div>
            )}

            <div className="space-y-3 sticky bottom-4">
            <button
              onClick={() => {
                if (item?.donorEmail) {
                  window.location.href = `mailto:${item.donorEmail}`;
                }
              }}
              className="w-full bg-[#7db038] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#4a6b1d] transition-all text-lg"
            >
              Contact Donor
            </button>
              <button onClick={handleClaim} className="w-full bg-white border-2 border-[#7db038] text-[#364f15] font-bold py-3 rounded-2xl hover:bg-[#7db038]/10 flex items-center justify-center gap-2 transition-colors">
                <CheckCircle size={20} /> Claim this Item
              </button>
            </div>
          </div>
        </div>

        {relatedItems.length > 0 && (
          <div className="mt-16 border-t border-[#7db038]/20 pt-10 mb-8">
            <h2 className="text-2xl font-bold text-[#364f15] mb-6">More Free {item.category || 'Items'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedItems.map((related) => (
                <Link 
                    to={`/donation/${related.id}`} 
                    key={related.id} 
                    className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full"
                    onClick={() => window.scrollTo(0,0)}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {related.image || (related.images && related.images[0]) ? (
                        <img 
                            src={related.image || related.images[0]} 
                            alt={related.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Gift size={32} />
                        </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{related.title}</h3>
                    <p className="text-[#7db038] font-black mt-auto">FREE</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};

export default DonationDetail;