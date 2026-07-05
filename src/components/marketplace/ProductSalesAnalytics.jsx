import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, TrendingUp, DollarSign, ShoppingBag, Users, Star, Sparkles, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function ProductSalesAnalytics({ product, onClose }) {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAllBuyers, setShowAllBuyers] = useState(false);

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['productSales', product.id],
    queryFn: () => base44.entities.Sale.filter({ product_id: product.id }, '-created_date', 100),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['productReviews', product.id],
    queryFn: () => base44.entities.Review.filter({ product_id: product.id }, '-created_date', 50),
  });

  const completedSales = sales.filter(s => s.status === 'completed');
  const totalRevenue = completedSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const avgSalePrice = completedSales.length ? (totalRevenue / completedSales.length).toFixed(2) : 0;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  // Group sales by month
  const salesByMonth = completedSales.reduce((acc, sale) => {
    const month = format(new Date(sale.created_date), 'MMM yyyy');
    if (!acc[month]) acc[month] = { count: 0, revenue: 0 };
    acc[month].count++;
    acc[month].revenue += sale.amount || 0;
    return acc;
  }, {});

  const maxRevenue = Math.max(...Object.values(salesByMonth).map(m => m.revenue), 1);

  const handleAIAnalyze = async () => {
    if (aiAnalysis) return;
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a business analyst. Analyze this product's sales performance:

Product: "${product.name}" (${product.category})
Price: $${product.price}
Total Sales: ${completedSales.length}
Total Revenue: $${totalRevenue.toFixed(2)}
Average Sale Price: $${avgSalePrice}
Pending Sales: ${sales.filter(s => s.status === 'pending').length}
Refunds: ${sales.filter(s => s.status === 'refunded').length}
Average Rating: ${avgRating || 'No reviews yet'}
Total Reviews: ${reviews.length}
Monthly breakdown: ${JSON.stringify(salesByMonth)}

Provide a short, actionable sales analysis in 3-4 sentences covering: performance summary, trends, and 1-2 specific recommendations to improve sales.`,
      });
      setAiAnalysis(result);
    } catch {
      setAiAnalysis('Could not generate analysis at this time. Please try again.');
    }
    setAiLoading(false);
  };

  const displayedBuyers = showAllBuyers ? completedSales : completedSales.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-white/10">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7 text-zinc-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{product.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-xs border-0 bg-white/10 text-zinc-300">{product.category}</Badge>
              <span className="text-emerald-400 font-semibold text-sm">${product.price}</span>
              {avgRating && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" /> {avgRating}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {salesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: DollarSign, label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'bg-emerald-500' },
                  { icon: ShoppingBag, label: 'Sold', value: completedSales.length, color: 'bg-indigo-500' },
                  { icon: TrendingUp, label: 'Avg Price', value: `$${avgSalePrice}`, color: 'bg-purple-500' },
                  { icon: Users, label: 'Buyers', value: new Set(completedSales.map(s => s.buyer_email)).size, color: 'bg-amber-500' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white/5 rounded-2xl p-4 text-center">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-xs text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Status breakdown */}
              {sales.length > 0 && (
                <div className="flex gap-3">
                  {[
                    { label: 'Completed', count: completedSales.length, cls: 'bg-emerald-500/20 text-emerald-400' },
                    { label: 'Pending', count: sales.filter(s => s.status === 'pending').length, cls: 'bg-amber-500/20 text-amber-400' },
                    { label: 'Refunded', count: sales.filter(s => s.status === 'refunded').length, cls: 'bg-rose-500/20 text-rose-400' },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className={`flex-1 rounded-xl px-3 py-2 text-center ${cls}`}>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs opacity-80">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Monthly chart */}
              {Object.keys(salesByMonth).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-zinc-400 uppercase tracking-wide">Revenue by Month</h3>
                  <div className="space-y-2">
                    {Object.entries(salesByMonth).map(([month, data]) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{month}</span>
                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-end pr-2"
                          >
                            <span className="text-xs text-white font-medium">${data.revenue.toFixed(0)}</span>
                          </motion.div>
                        </div>
                        <span className="text-xs text-zinc-500 w-12 text-right flex-shrink-0">{data.count} sold</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-semibold text-sm">AI Sales Analysis</h3>
                  </div>
                  {!aiAnalysis && (
                    <Button size="sm" onClick={handleAIAnalyze} disabled={aiLoading} className="btn-primary rounded-lg h-7 text-xs px-3 gap-1.5">
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  )}
                </div>
                {aiAnalysis ? (
                  <p className="text-sm text-zinc-300 leading-relaxed">{aiAnalysis}</p>
                ) : (
                  <p className="text-sm text-zinc-500">Click "Analyze" to get AI-powered insights and recommendations for this product.</p>
                )}
              </div>

              {/* Recent buyers */}
              {completedSales.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-zinc-400 uppercase tracking-wide">Recent Buyers</h3>
                  <div className="space-y-2">
                    {displayedBuyers.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{sale.buyer_name || sale.buyer_email}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(sale.created_date), 'MMM d, yyyy')}</p>
                        </div>
                        <span className="text-emerald-400 font-semibold text-sm">${sale.amount}</span>
                      </div>
                    ))}
                  </div>
                  {completedSales.length > 5 && (
                    <button
                      onClick={() => setShowAllBuyers(v => !v)}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors"
                    >
                      {showAllBuyers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAllBuyers ? 'Show less' : `Show all ${completedSales.length} buyers`}
                    </button>
                  )}
                </div>
              )}

              {sales.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                  <p className="font-medium">No sales yet</p>
                  <p className="text-sm mt-1">Sales data will appear here once buyers purchase this product.</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}