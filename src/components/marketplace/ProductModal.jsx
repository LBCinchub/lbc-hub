import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, MessageSquare, Send, Package,
  ArrowRight, CheckCircle, ShoppingBag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-7 h-7 ${(hovered || value) >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId, sellerEmail, user, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('product');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Review.create(data),
    onSuccess: async () => {
      // Update product avg_rating
      const allReviews = await base44.entities.Review.filter({ product_id: productId, type: 'product' });
      if (allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        await base44.entities.Product.update(productId, { avg_rating: parseFloat(avg.toFixed(1)), review_count: allReviews.length });
      }
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      onDone();
    }
  });

  const handleSubmit = () => {
    if (!rating) return;
    mutation.mutate({
      product_id: productId,
      seller_email: sellerEmail,
      reviewer_name: user.full_name || user.email,
      reviewer_email: user.email,
      rating,
      comment,
      type,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {['product', 'seller'].map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${type === t ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}
          >
            Review {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div>
        <Label className="text-zinc-400 mb-2 block">Your Rating</Label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div>
        <Label className="text-zinc-400 mb-1 block">Comment (optional)</Label>
        <Textarea value={comment} onChange={e => setComment(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500" placeholder="Share your experience..." />
      </div>
      <Button onClick={handleSubmit} disabled={!rating || mutation.isPending} className="btn-primary rounded-xl w-full">
        {mutation.isPending ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}

function InquiryForm({ product, user, onDone }) {
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: (data) => base44.entities.BuyerInquiry.create(data),
    onSuccess: onDone,
  });

  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
        placeholder="Ask the seller a question about this product..."
        rows={3}
      />
      <Button
        onClick={() => mutation.mutate({
          product_id: product.id,
          product_name: product.name,
          seller_email: product.seller_email,
          buyer_name: user.full_name || user.email,
          buyer_email: user.email,
          message,
        })}
        disabled={!message.trim() || mutation.isPending}
        className="btn-primary rounded-xl w-full"
      >
        <Send className="w-4 h-4 mr-2" />
        {mutation.isPending ? 'Sending...' : 'Send Inquiry'}
      </Button>
    </div>
  );
}

export default function ProductModal({ product, user, onClose }) {
  const [activeSection, setActiveSection] = useState(null); // 'review' | 'inquiry'
  const [done, setDone] = useState(null);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: () => base44.entities.Review.filter({ product_id: product.id }, '-created_date', 20),
  });

  const productReviews = reviews.filter(r => r.type === 'product');
  const sellerReviews = reviews.filter(r => r.type === 'seller');
  const avgRating = productReviews.length
    ? (productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(1)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-8"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl glass rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Image */}
          <div className="relative aspect-video">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <Package className="w-20 h-20 text-zinc-600" />
              </div>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="absolute top-4 left-4">
              <Badge className={`backdrop-blur-md border-0 ${product.category === 'products' ? 'bg-indigo-500/80' : product.category === 'services' ? 'bg-emerald-500/80' : 'bg-amber-500/80'}`}>
                {product.category}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Info */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <span className="text-2xl font-bold gradient-text flex-shrink-0">${product.price}</span>
              </div>
              {product.seller_name && <p className="text-sm text-zinc-400">Sold by <span className="text-indigo-400">{product.seller_name}</span></p>}
              {avgRating && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${parseFloat(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{avgRating}</span>
                  <span className="text-sm text-zinc-500">({productReviews.length} reviews)</span>
                </div>
              )}
              <p className="text-zinc-300 mt-3 leading-relaxed">{product.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button className="btn-primary rounded-xl flex-1 py-3">
                <ShoppingBag className="w-4 h-4 mr-2" /> Buy Now
              </Button>
              {user && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection(activeSection === 'inquiry' ? null : 'inquiry')}
                    className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Ask Seller
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection(activeSection === 'review' ? null : 'review')}
                    className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl"
                  >
                    <Star className="w-4 h-4 mr-2" /> Review
                  </Button>
                </>
              )}
            </div>

            {/* Forms */}
            <AnimatePresence>
              {done === 'review' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle className="w-5 h-5" /> Review submitted! Thank you.
                </motion.div>
              )}
              {done === 'inquiry' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle className="w-5 h-5" /> Inquiry sent! The seller will reply soon.
                </motion.div>
              )}
              {activeSection === 'review' && !done && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="glass rounded-2xl p-5 border border-amber-500/20">
                    <h3 className="font-semibold mb-4">Write a Review</h3>
                    <ReviewForm productId={product.id} sellerEmail={product.seller_email} user={user} onDone={() => { setDone('review'); setActiveSection(null); }} />
                  </div>
                </motion.div>
              )}
              {activeSection === 'inquiry' && !done && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="glass rounded-2xl p-5 border border-indigo-500/20">
                    <h3 className="font-semibold mb-4">Ask the Seller</h3>
                    <InquiryForm product={product} user={user} onDone={() => { setDone('inquiry'); setActiveSection(null); }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Reviews ({reviews.length})</h3>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                              {review.reviewer_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">{review.reviewer_name || 'Anonymous'}</p>
                          <Badge className="text-xs border-0 bg-white/10 text-zinc-400">{review.type}</Badge>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${review.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-zinc-300 mt-1">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}