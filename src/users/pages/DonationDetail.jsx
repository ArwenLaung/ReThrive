import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2, Gift, User, Mail, CheckCircle } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const DonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
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
              <div className="flex items-center gap-2 text-[#7db038]/80 mb-4"><MapPin size={16} /><span className="text-sm font-medium">{item.location}</span></div>
              <p className="text-4xl font-black text-[#7db038]">FREE</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#7db038]/20 shadow-sm">
              <h2 className="text-lg font-bold text-[#364f15] mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
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
      </main>
    </div>
  );
};

export default DonationDetail;