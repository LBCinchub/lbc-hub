import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Package, Star, ShoppingBag, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import ProductModal from './ProductModal';

export default function SellerProfileModal({ sellerEmail, sellerName, currentUser, onClose }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();

  const { data: products = [] } = useQuery({
    queryKey: ['sellerProducts', sellerEmail],
    queryFn: () => base44.entities.Product.filter({ seller_email: sellerEmail }, '-created_date', 50),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['sellerReviews', sellerEmail],
    queryFn: () => base44.entities.Review.filter({ seller_email: sellerEmail, type: 'seller' }, '-created_date', 20),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sellerSales', sellerEmail],
    queryFn: () => base44.entities.Sale.filter({ seller_email: sellerEmail }, '-created_date', 100),
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const totalRevenue = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.amount || 0), 0);



  const handleSeeProfile = () => {
    onClose();
    navigate(`/Profile?email=${encodeURIComponent(sellerEmail)}`);
  };

  if (selectedProduct) {
    return (
      <ProductModal
        product={selectedProduct}
        user={currentUser}
        onClose={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-8"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">
                {sellerName?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{sellerName}</h2>
              <p className="text-sm text-zinc-400">{sellerEmail}</p>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-zinc-400">{products.length} listings</span>
                {avgRating && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {avgRating}
                  </span>
                )}
                <span className="text-emerald-400">${totalRevenue.toLocaleString()} revenue</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSeeProfile}
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl gap-1.5"
            >
              <User className="w-4 h-4" /> See Profile
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <h3 className="font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> All Listings ({products.length})
          </h3>
          {products.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <Package className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
              <p>No listings yet.</p>
            </div>
          ) : (
            products.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/8 transition-colors cursor-pointer hover:ring-1 hover:ring-indigo-500/40"
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{product.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="text-xs border-0 bg-white/10 text-zinc-300">{product.category}</Badge>
                    {product.avg_rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />{product.avg_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-400 flex-shrink-0">${product.price}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}