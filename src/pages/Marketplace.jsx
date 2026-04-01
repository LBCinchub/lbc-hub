import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingBag, Tag, Star, 
  ArrowRight, Package, Briefcase, Award, LayoutDashboard, Plus
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SellerDashboard from '../components/marketplace/SellerDashboard';
import ProductModal from '../components/marketplace/ProductModal';

const categories = [
  { id: 'all', label: 'All Items', icon: ShoppingBag },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'branded', label: 'Branded', icon: Award },
];

const demoProducts = [
  { id: 'd1', name: 'Premium Headphones', description: 'Wireless noise-canceling audio experience', price: 299, category: 'products', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', seller_name: 'TechPro', avg_rating: 4.8, review_count: 24 },
  { id: 'd2', name: 'Design Consultation', description: 'Professional UI/UX design services', price: 150, category: 'services', image_url: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=400&fit=crop', seller_name: 'Creative Labs', avg_rating: 4.9, review_count: 11 },
  { id: 'd3', name: 'LBC Branded Hoodie', description: 'Premium comfort, exclusive design', price: 89, category: 'branded', image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', seller_name: 'LBC Official', avg_rating: 4.7, review_count: 38 },
  { id: 'd4', name: 'Smart Watch Pro', description: 'Track fitness, stay connected', price: 449, category: 'products', image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop', seller_name: 'FitTech', avg_rating: 4.6, review_count: 52 },
  { id: 'd5', name: 'Marketing Strategy', description: 'Complete digital marketing package', price: 500, category: 'services', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop', seller_name: 'GrowthCo', avg_rating: 5.0, review_count: 7 },
  { id: 'd6', name: 'LBC Cap Collection', description: 'Street style meets comfort', price: 45, category: 'branded', image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop', seller_name: 'LBC Official', avg_rating: 4.5, review_count: 19 },
];

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [openAddListing, setOpenAddListing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 50),
  });

  const allProducts = products.length > 0 ? products : demoProducts;

  const displayProducts = selectedSeller 
    ? allProducts.filter(p => p.seller_name === selectedSeller)
    : allProducts.filter(p => {
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch = !searchQuery ||
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
            <p className="text-zinc-400">Discover products, services, and exclusive branded goods</p>
          </motion.div>
          {user && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
              <Button
                onClick={() => { setOpenAddListing(true); setShowDashboard(true); }}
                size="icon"
                className="btn-primary rounded-xl"
                title="Add Listing"
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => { setOpenAddListing(false); setShowDashboard(true); }}
                className="btn-primary rounded-xl gap-2 whitespace-nowrap"
              >
                <LayoutDashboard className="w-4 h-4" />
                Seller Dashboard
              </Button>
            </motion.div>
          )}
        </div>

        {/* Search & Filters */}
        <motion.div
          className="glass rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, services..."
                className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  onClick={() => setActiveCategory(category.id)}
                  className={`rounded-xl whitespace-nowrap ${
                    activeCategory === category.id
                      ? 'btn-primary border-0'
                      : 'border-white/20 bg-transparent hover:bg-white/10'
                  }`}
                >
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Seller Header */}
        {selectedSeller && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedSeller}'s Storefront</h2>
              <p className="text-zinc-400 mt-1">{displayProducts.length} item{displayProducts.length !== 1 ? 's' : ''}</p>
            </div>
            <Button onClick={() => setSelectedSeller(null)} variant="outline" className="border-white/20">Back to All</Button>
          </motion.div>
        )}

        {/* Products Grid */}
         {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/10" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-2/3 bg-white/10 rounded" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-6 w-1/3 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-16 text-center">
            <ShoppingBag className="w-20 h-20 mx-auto text-zinc-600 mb-6" />
            <h3 className="text-2xl font-semibold mb-2">No items found</h3>
            <p className="text-zinc-400">Try adjusting your search or filter criteria</p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group glass rounded-2xl overflow-hidden card-hover cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="aspect-square relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <Package className="w-16 h-16 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <Badge className={`
                      ${product.category === 'products' ? 'bg-indigo-500/80' : ''}
                      ${product.category === 'services' ? 'bg-emerald-500/80' : ''}
                      ${product.category === 'branded' ? 'bg-amber-500/80' : ''}
                      backdrop-blur-md border-0
                    `}>
                      {product.category}
                    </Badge>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h3>
                  {product.seller_name && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); setSelectedSeller(product.seller_name); }} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-2 block">by {product.seller_name}</button>
                  )}
                  {(product.avg_rating > 0 || product.review_count > 0) && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${(product.avg_rating || 0) >= s ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-zinc-400">({product.review_count || 0})</span>
                    </div>
                  )}
                  <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold gradient-text">${product.price}</span>
                    <Button size="sm" className="btn-primary rounded-full">
                      View <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <motion.div
          className="mt-16 glass rounded-2xl p-8 text-center glow"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Tag className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Want to Sell on LBC Hub?</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            List your products or services and reach thousands of engaged buyers
          </p>
          <Button onClick={() => user ? setShowDashboard(true) : base44.auth.redirectToLogin()} className="btn-primary rounded-full px-8 py-4 text-lg">
            Start Selling
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>

      {/* Seller Dashboard Modal */}
      <AnimatePresence>
        {showDashboard && user && (
          <SellerDashboard 
            user={user} 
            onClose={() => { setShowDashboard(false); setOpenAddListing(false); }}
            openAddListing={openAddListing}
          />
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            user={user}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}