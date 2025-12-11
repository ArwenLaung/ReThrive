import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Heart, Loader2, ShoppingBag, User, Mail } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const itemDoc = await getDoc(doc(db, 'items', id));
        if (itemDoc.exists()) {
          setItem({ id: itemDoc.id, ...itemDoc.data() });
        } else {
          setItem(null);
        }
      } catch (error) {
        console.error('Error fetching item:', error);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-brand-purple mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-2xl font-semibold text-gray-900 mb-6">
            Item not found or has been removed.
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-brand-purple font-semibold hover:text-purple-800 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to marketplace
          </Link>
        </main>
      </div>
    );
  }

  const images = item.images || (item.image ? [item.image] : []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-purple transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Marketplace</span>
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <ShoppingBag className="text-gray-400" size={64} />
                </div>
              )}

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-colors"
                  >
                    <ArrowLeft size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-colors rotate-180"
                  >
                    <ArrowLeft size={20} className="text-gray-700" />
                  </button>
                </>
              )}

              {/* Favorite Button */}
              <button className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors">
                <Heart size={20} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${currentImageIndex === idx
                        ? 'border-brand-purple shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <img src={img} alt={`${item.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-black text-gray-900">{item.title}</h1>
                <span className="bg-brand-purple/10 text-brand-purple text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                  {item.condition || 'Used'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin size={16} />
                <span className="text-sm font-medium">{item.location}</span>
              </div>

              <div className="mb-6">
                <p className="text-4xl font-black text-brand-purple mb-2">RM {item.price?.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Category: <span className="font-semibold text-gray-700">{item.category}</span></p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.description || 'No description provided.'}
              </p>
            </div>

            {/* Seller Information */}
            {(item.sellerName || item.sellerEmail) && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Seller Information</h2>
                <div className="space-y-3">
                  {item.sellerName && (
                    <div className="flex items-center gap-3">
                      <User size={18} className="text-gray-400" />
                      <span className="text-gray-700 font-medium">{item.sellerName}</span>
                    </div>
                  )}
                  {item.sellerEmail && (
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-gray-400" />
                      <a href={`mailto:${item.sellerEmail}`} className="text-brand-purple hover:underline">
                        {item.sellerEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 sticky bottom-4">
              <button className="w-full bg-brand-purple text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-purple-800 transition-all active:scale-95 text-lg">
                Contact Seller
              </button>
              <button className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors">
                Save for Later
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetail;

