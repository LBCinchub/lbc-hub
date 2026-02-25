import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, Car, Utensils, MapPin, 
  Sparkles, Loader2, ExternalLink, Calendar, 
  Star, Thermometer, Globe, DollarSign, ShieldCheck,
  Camera, Landmark, UtensilsCrossed, Clock, ArrowRight
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const bookingCategories = [
  { id: 'flights', label: 'Flights', icon: Plane, color: 'from-sky-500 to-blue-600' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'from-violet-500 to-purple-600' },
  { id: 'cars', label: 'Car Rental', icon: Car, color: 'from-emerald-500 to-teal-600' },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils, color: 'from-orange-500 to-red-600' },
];

const popularDestinations = [
  { name: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop', rating: 4.9, tag: 'Romantic' },
  { name: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop', rating: 4.8, tag: 'Cultural' },
  { name: 'New York', country: 'USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop', rating: 4.7, tag: 'Urban' },
  { name: 'Dubai', country: 'UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop', rating: 4.8, tag: 'Luxury' },
  { name: 'Santorini', country: 'Greece', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop', rating: 4.9, tag: 'Scenic' },
  { name: 'Bali', country: 'Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop', rating: 4.8, tag: 'Tropical' },
  { name: 'Rome', country: 'Italy', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop', rating: 4.7, tag: 'Historic' },
  { name: 'Sydney', country: 'Australia', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&h=400&fit=crop', rating: 4.7, tag: 'Coastal' },
];

// Unsplash keyword mapping for destinations
const getDestinationImages = (dest) => [
  `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=500&fit=crop&q=${encodeURIComponent(dest)}`,
  `https://source.unsplash.com/800x500/?${encodeURIComponent(dest)},travel,landmark`,
  `https://source.unsplash.com/800x500/?${encodeURIComponent(dest)},city,tourism`,
];

export default function Travel() {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [travelData, setTravelData] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const handleSearch = async (dest) => {
    const query = dest || destination.trim();
    if (!query) return;
    if (dest) setDestination(dest);
    setLoading(true);
    setTravelData(null);
    setActivePhotoIdx(0);
    setActiveTab('overview');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a travel expert. Provide a rich, detailed travel guide for: "${query}".
      Include everything a traveler would need to know. Be specific, accurate, and enthusiastic.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          destination_name: { type: 'string', description: 'Full destination name e.g. Paris, France' },
          tagline: { type: 'string', description: 'A catchy one-liner about this destination' },
          overview: { type: 'string', description: 'A vivid 3-4 sentence description of the destination' },
          best_time: { type: 'string' },
          weather: { type: 'string', description: 'Typical weather/climate overview' },
          language: { type: 'string' },
          currency: { type: 'string' },
          timezone: { type: 'string' },
          safety_score: { type: 'number', description: 'Safety score out of 5' },
          budget_per_day: { type: 'string', description: 'Estimated budget range per day in USD' },
          attractions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', description: 'e.g. Museum, Nature, Historical, Shopping' },
                tip: { type: 'string', description: 'A quick practical tip' }
              }
            }
          },
          cuisine: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          cultural_tips: { type: 'array', items: { type: 'string' } },
          budget_tips: { type: 'array', items: { type: 'string' } },
          hidden_gems: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } },
          photo_keywords: { type: 'array', items: { type: 'string' }, description: 'List of 6 specific landmark/place names for photo searches, e.g. ["Eiffel Tower", "Louvre Museum"]' },
          unsplash_query: { type: 'string', description: 'Best single search term for Unsplash to find beautiful photos of this destination' }
        }
      }
    });

    setTravelData(response);
    setLoading(false);
  };

  const handleBookingClick = (categoryId) => {
    const query = encodeURIComponent(travelData?.destination_name || destination || 'travel');
    const urls = {
      flights: `https://www.google.com/travel/flights?q=flights+to+${query}`,
      hotels: `https://www.google.com/travel/hotels?q=hotels+in+${query}`,
      cars: `https://www.google.com/search?q=car+rental+${query}`,
      restaurants: `https://www.google.com/maps/search/restaurants+${query}`,
    };
    window.open(urls[categoryId], '_blank');
  };

  const getUnsplashUrl = (keyword, w = 800, h = 500, idx = 0) => {
    const seeds = ['nature', 'travel', 'city', 'landmark', 'architecture', 'tourism'];
    return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(keyword)},${seeds[idx % seeds.length]}`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'attractions', label: 'Attractions', icon: Landmark },
    { id: 'food', label: 'Food', icon: UtensilsCrossed },
    { id: 'practical', label: 'Practical', icon: ShieldCheck },
    { id: 'gems', label: 'Hidden Gems', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore the <span className="gradient-text">World</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            AI-powered travel guides with stunning photos, tips, and booking tools
          </p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 md:p-8 mb-8 glow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search any country, city, or destination..."
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 rounded-xl text-lg"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !destination.trim()}
              className="h-14 px-8 btn-primary rounded-xl text-lg"
            >
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Exploring...</> : <><Sparkles className="w-5 h-5 mr-2" />Explore</>}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {bookingCategories.map((cat) => (
              <button key={cat.id} onClick={() => handleBookingClick(cat.id)} className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                  <cat.icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-sm">{cat.label}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-zinc-500 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-16 text-center mb-8">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Globe className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white mb-2">Discovering {destination}...</p>
              <p className="text-zinc-400">Gathering photos, tips, and travel insights</p>
            </motion.div>
          )}

          {/* Results */}
          {travelData && !loading && (
            <motion.div key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Hero with photos */}
              <div className="glass rounded-3xl overflow-hidden">
                <div className="relative h-72 md:h-96 overflow-hidden bg-zinc-900">
                  <img
                    key={activePhotoIdx}
                    src={getUnsplashUrl(travelData.photo_keywords?.[activePhotoIdx] || travelData.unsplash_query || destination, 1200, 500, activePhotoIdx)}
                    alt={travelData.destination_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = `https://source.unsplash.com/1200x500/?${encodeURIComponent(destination)},travel`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Photo nav */}
                  {travelData.photo_keywords?.length > 1 && (
                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                      {travelData.photo_keywords.slice(0, 6).map((_, i) => (
                        <button key={i} onClick={() => setActivePhotoIdx(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === activePhotoIdx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/70'}`} />
                      ))}
                    </div>
                  )}

                  {/* Photo label */}
                  {travelData.photo_keywords?.[activePhotoIdx] && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white">
                      <Camera className="w-3 h-3" />
                      {travelData.photo_keywords[activePhotoIdx]}
                    </div>
                  )}

                  <div className="absolute bottom-6 left-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">{travelData.destination_name}</h2>
                    <p className="text-zinc-300 mt-1 italic">{travelData.tagline}</p>
                  </div>
                </div>

                {/* Photo strip */}
                {travelData.photo_keywords?.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-black/30">
                    {travelData.photo_keywords.slice(0, 6).map((kw, i) => (
                      <button key={i} onClick={() => setActivePhotoIdx(i)}
                        className={`flex-shrink-0 rounded-xl overflow-hidden transition-all ${i === activePhotoIdx ? 'ring-2 ring-indigo-500 scale-95' : 'opacity-60 hover:opacity-100'}`}
                        style={{ width: 80, height: 56 }}>
                        <img src={getUnsplashUrl(kw, 160, 112, i)} alt={kw} className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = `https://source.unsplash.com/160x112/?${encodeURIComponent(kw)}`; }} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
                  {[
                    { icon: Calendar, label: 'Best Time', value: travelData.best_time },
                    { icon: DollarSign, label: 'Budget/Day', value: travelData.budget_per_day },
                    { icon: Thermometer, label: 'Climate', value: travelData.weather?.split('.')[0] },
                    { icon: Globe, label: 'Language', value: travelData.language },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-zinc-900/60">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                        <stat.icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-sm font-semibold text-white truncate">{stat.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="flex overflow-x-auto border-b border-white/5">
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                        ${activeTab === tab.id ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* Overview */}
                  {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <p className="text-zinc-300 text-lg leading-relaxed">{travelData.overview}</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="glass rounded-xl p-4 space-y-2">
                          <h4 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">Quick Info</h4>
                          {[
                            { label: 'Currency', value: travelData.currency },
                            { label: 'Timezone', value: travelData.timezone },
                            { label: 'Language', value: travelData.language },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-zinc-500">{item.label}</span>
                              <span className="text-white font-medium">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="glass rounded-xl p-4">
                          <h4 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-2">Safety</h4>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <div key={s} className={`w-6 h-6 rounded-full ${s <= (travelData.safety_score || 0) ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                              ))}
                            </div>
                            <span className="text-zinc-300 text-sm">{travelData.safety_score}/5</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Attractions */}
                  {activeTab === 'attractions' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
                      {travelData.attractions?.map((attraction, i) => (
                        <div key={i} className="group glass rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all border border-white/5">
                          <div className="h-36 overflow-hidden bg-zinc-800 relative">
                            <img
                              src={getUnsplashUrl(attraction.name + ' ' + destination, 400, 200, i)}
                              alt={attraction.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { e.target.src = `https://source.unsplash.com/400x200/?${encodeURIComponent(attraction.name)}`; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-3 text-xs px-2 py-0.5 rounded-full bg-indigo-500/80 text-white">{attraction.category}</span>
                          </div>
                          <div className="p-4">
                            <h4 className="font-semibold text-white mb-1">{attraction.name}</h4>
                            <p className="text-zinc-400 text-sm mb-2">{attraction.description}</p>
                            {attraction.tip && (
                              <p className="text-xs text-indigo-300 bg-indigo-500/10 rounded-lg px-3 py-2">
                                💡 {attraction.tip}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Food */}
                  {activeTab === 'food' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {travelData.cuisine?.map((item, i) => (
                          <div key={i} className="glass rounded-xl overflow-hidden group hover:border-orange-500/30 transition-all border border-white/5">
                            <div className="h-28 overflow-hidden bg-zinc-800">
                              <img
                                src={getUnsplashUrl(item.name + ' food', 300, 150, i)}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.target.src = `https://source.unsplash.com/300x150/?${encodeURIComponent(item.name)},food`; }}
                              />
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-white text-sm mb-1">{item.name}</h4>
                              <p className="text-zinc-400 text-xs">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="glass rounded-xl p-5">
                        <h3 className="font-semibold text-lg mb-3">🎭 Cultural Tips</h3>
                        <ul className="space-y-2">
                          {travelData.cultural_tips?.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                              <span className="text-violet-400 mt-1 flex-shrink-0">•</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}

                  {/* Practical */}
                  {activeTab === 'practical' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="glass rounded-xl p-5">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" />Budget Tips</h3>
                        <ul className="space-y-2">
                          {travelData.budget_tips?.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                              <span className="text-emerald-400 mt-1 flex-shrink-0">✓</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="glass rounded-xl p-5">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2"><Thermometer className="w-5 h-5 text-sky-400" />Weather & Climate</h3>
                        <p className="text-zinc-300 text-sm">{travelData.weather}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Hidden Gems */}
                  {activeTab === 'gems' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
                      {travelData.hidden_gems?.map((gem, i) => (
                        <div key={i} className="glass rounded-xl overflow-hidden group hover:border-amber-500/30 transition-all border border-white/5">
                          <div className="h-32 overflow-hidden bg-zinc-800">
                            <img
                              src={getUnsplashUrl(gem.name + ' ' + destination, 400, 180, i + 3)}
                              alt={gem.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { e.target.src = `https://source.unsplash.com/400x180/?${encodeURIComponent(gem.name)}`; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <h4 className="font-semibold text-white">{gem.name}</h4>
                            </div>
                            <p className="text-zinc-400 text-sm">{gem.description}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Book Now CTA */}
                <div className="px-6 pb-6 flex flex-wrap gap-3">
                  {bookingCategories.map(cat => (
                    <button key={cat.id} onClick={() => handleBookingClick(cat.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${cat.color} text-white text-sm font-medium hover:opacity-90 transition-opacity`}>
                      <cat.icon className="w-4 h-4" />
                      Book {cat.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popular Destinations */}
        {!travelData && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularDestinations.map((dest, index) => (
                <motion.div
                  key={dest.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.07 }}
                  onClick={() => handleSearch(`${dest.name}, ${dest.country}`)}
                  className="group glass rounded-2xl overflow-hidden cursor-pointer card-hover"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-indigo-500/80 text-white">{dest.tag}</span>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-semibold text-lg">{dest.name}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-zinc-300 text-sm">{dest.country}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-zinc-200">{dest.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}