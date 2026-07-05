import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import ProductSalesAnalytics from './ProductSalesAnalytics';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, MessageSquare, TrendingUp,
  Plus, Pencil, Trash2, X, Star, DollarSign, CheckCircle, Clock, Send, Upload, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
    </div>
  );
}

function ListingForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || { name: '', description: '', price: '', category: 'products', image_url: '', in_stock: true });
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      set('image_url', result.file_url);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image. Please try again.');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-zinc-300 mb-1 block">Product Name</Label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500" placeholder="Product Name" />
      </div>
      
      <div>
        <Label className="text-zinc-300 mb-2 block">Product Image</Label>
        {form.image_url ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-white/5 mb-2 group">
            <img src={form.image_url} alt="Product" className="w-full h-full object-cover" />
            <button
              onClick={() => set('image_url', '')}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <><Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" /><span className="text-sm text-zinc-400">Uploading...</span></>
            ) : (
              <><Upload className="w-8 h-8 text-zinc-400 mb-2" /><span className="text-sm text-zinc-400">Click to upload image</span></>
            )}
          </label>
        )}
      </div>
      <div>
        <Label className="text-zinc-300 mb-1 block">Description</Label>
        <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500" placeholder="Describe your product..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-300 mb-1 block">Price ($)</Label>
          <Input type="number" value={form.price} onChange={e => set('price', parseFloat(e.target.value))} className="bg-white/5 border-white/10 text-white" placeholder="0.00" />
        </div>
        <div>
          <Label className="text-zinc-300 mb-1 block">Category</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="branded">Branded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.price || saving} className="btn-primary rounded-xl flex-1">
          {saving ? 'Saving...' : 'Save Listing'}
        </Button>
        <Button onClick={onCancel} variant="outline" className="border-white/20 bg-transparent hover:bg-white/10 rounded-xl">Cancel</Button>
      </div>
    </div>
  );
}

export default function SellerDashboard({ user, onClose, openAddListing = false }) {
  const [tab, setTab] = useState(openAddListing ? 'listings' : 'overview');
  const [editingProduct, setEditingProduct] = useState(null);
  const [creatingNew, setCreatingNew] = useState(openAddListing);
  const [replyText, setReplyText] = useState({});
  const [analyticsProduct, setAnalyticsProduct] = useState(null);
  const queryClient = useQueryClient();

  const { data: myProducts = [] } = useQuery({
    queryKey: ['myProducts', user.email],
    queryFn: () => base44.entities.Product.filter({ seller_email: user.email }, '-created_date', 50),
  });

  const { data: mySales = [] } = useQuery({
    queryKey: ['mySales', user.email],
    queryFn: () => base44.entities.Sale.filter({ seller_email: user.email }, '-created_date', 50),
  });

  const { data: myInquiries = [] } = useQuery({
    queryKey: ['myInquiries', user.email],
    queryFn: () => base44.entities.BuyerInquiry.filter({ seller_email: user.email }, '-created_date', 50),
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ['myReviews', user.email],
    queryFn: () => base44.entities.Review.filter({ seller_email: user.email }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create({ ...data, seller_email: user.email, seller_name: user.full_name || user.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myProducts'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); setCreatingNew(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myProducts'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); setEditingProduct(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myProducts'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); }
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => base44.entities.BuyerInquiry.update(id, { reply, status: 'replied' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myInquiries'] }); }
  });

  const totalRevenue = mySales.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.amount || 0), 0);
  const avgRating = myReviews.length ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1) : '—';
  const openInquiries = myInquiries.filter(i => i.status === 'open').length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, badge: openInquiries },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-4 px-4 pb-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-5xl glass rounded-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold">Seller Dashboard</h2>
            <p className="text-zinc-400 text-sm">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors relative ${
                tab === t.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Package} label="Active Listings" value={myProducts.length} color="bg-indigo-500" />
                <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="bg-emerald-500" />
                <StatCard icon={Star} label="Avg. Rating" value={avgRating} color="bg-amber-500" />
                <StatCard icon={MessageSquare} label="Open Inquiries" value={openInquiries} color="bg-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-3">Recent Sales</h3>
                {mySales.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No sales yet. List products to start selling.</p>
                ) : (
                  <div className="space-y-2">
                    {mySales.slice(0, 5).map(sale => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{sale.product_name}</p>
                          <p className="text-xs text-zinc-500">{sale.buyer_name || sale.buyer_email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-400">${sale.amount}</p>
                          <Badge className={`text-xs border-0 ${sale.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {sale.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LISTINGS */}
          {tab === 'listings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">My Listings ({myProducts.length})</h3>
                <Button onClick={() => setCreatingNew(true)} className="btn-primary rounded-xl text-sm gap-1.5">
                  <Plus className="w-4 h-4" /> New Listing
                </Button>
              </div>

              <AnimatePresence>
                {creatingNew && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="glass rounded-2xl p-5 border border-indigo-500/30">
                      <h4 className="font-semibold mb-4">New Listing</h4>
                      <ListingForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setCreatingNew(false)} saving={createMutation.isPending} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {myProducts.map(product => (
                  <div key={product.id}>
                    {editingProduct === product.id ? (
                      <div className="glass rounded-2xl p-5 border border-indigo-500/30">
                        <ListingForm
                          initial={product}
                          onSave={(data) => updateMutation.mutate({ id: product.id, data })}
                          onCancel={() => setEditingProduct(null)}
                          saving={updateMutation.isPending}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/8 transition-colors">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-zinc-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-emerald-400 font-semibold">${product.price}</span>
                            <Badge className="text-xs border-0 bg-white/10 text-zinc-300">{product.category}</Badge>
                            {product.avg_rating > 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />{product.avg_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setAnalyticsProduct(product)} className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors text-zinc-400 hover:text-indigo-400" title="View Sales Analytics">
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingProduct(product.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(product.id)} className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-zinc-400 hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {myProducts.length === 0 && !creatingNew && (
                  <div className="text-center py-10 text-zinc-500">
                    <Package className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                    <p>No listings yet. Create your first one!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INQUIRIES */}
          {tab === 'inquiries' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Buyer Inquiries ({myInquiries.length})</h3>
              {myInquiries.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                  <p>No inquiries yet.</p>
                </div>
              ) : myInquiries.map(inq => (
                <div key={inq.id} className="glass rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{inq.buyer_name || inq.buyer_email}</p>
                      <p className="text-xs text-zinc-500">Re: {inq.product_name}</p>
                    </div>
                    <Badge className={`border-0 text-xs flex-shrink-0 ${
                      inq.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                      inq.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {inq.status === 'open' ? <Clock className="w-3 h-3 mr-1 inline" /> : <CheckCircle className="w-3 h-3 mr-1 inline" />}
                      {inq.status}
                    </Badge>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-sm text-zinc-300">{inq.message}</div>
                  {inq.reply && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-sm text-zinc-200">
                      <p className="text-xs text-indigo-400 mb-1 font-medium">Your reply:</p>
                      {inq.reply}
                    </div>
                  )}
                  {inq.status === 'open' && (
                    <div className="flex gap-2">
                      <Input
                        value={replyText[inq.id] || ''}
                        onChange={e => setReplyText(r => ({ ...r, [inq.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-sm"
                      />
                      <Button
                        onClick={() => replyMutation.mutate({ id: inq.id, reply: replyText[inq.id] })}
                        disabled={!replyText[inq.id]?.trim() || replyMutation.isPending}
                        size="icon"
                        className="btn-primary rounded-xl flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SALES */}
          {tab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-1">Total Revenue</p>
                </div>
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold">{mySales.filter(s => s.status === 'completed').length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Completed</p>
                </div>
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{mySales.filter(s => s.status === 'pending').length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Pending</p>
                </div>
              </div>
              {mySales.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                  <p>No sales data yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySales.map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div>
                        <p className="font-medium text-sm">{sale.product_name}</p>
                        <p className="text-xs text-zinc-500">{sale.buyer_name || sale.buyer_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">${sale.amount}</p>
                        <Badge className={`text-xs border-0 ${sale.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : sale.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {sale.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS */}
          {tab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="glass rounded-2xl p-4 text-center flex-shrink-0">
                  <p className="text-4xl font-bold gradient-text">{avgRating}</p>
                  <div className="flex justify-center gap-0.5 my-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${parseFloat(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500">{myReviews.length} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5,4,3,2,1].map(star => {
                    const count = myReviews.filter(r => Math.round(r.rating) === star).length;
                    const pct = myReviews.length ? (count / myReviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-zinc-400">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-4 text-zinc-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                {myReviews.map(review => (
                  <div key={review.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{review.reviewer_name || 'Anonymous'}</p>
                        <p className="text-xs text-zinc-500">{review.type === 'seller' ? 'Seller review' : 'Product review'}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${review.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-zinc-300">{review.comment}</p>}
                  </div>
                ))}
                {myReviews.length === 0 && (
                  <div className="text-center py-10 text-zinc-500">
                    <Star className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                    <p>No reviews yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>

    {analyticsProduct && (
      <ProductSalesAnalytics
        product={analyticsProduct}
        onClose={() => setAnalyticsProduct(null)}
      />
    )}
    </>
  );
}