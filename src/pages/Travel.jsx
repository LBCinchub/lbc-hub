import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, Car, Utensils, MapPin, 
  Sparkles, Loader2, ExternalLink, Calendar, 
  Star, Thermometer, Globe, DollarSign, ShieldCheck,
  Camera, Landmark, UtensilsCrossed, ArrowRight
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const bookingCategories = [
  { id: 'flights', label: 'Flights', icon: Plane, color: 'from-sky-500 to-blue-600' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'from-violet-500 to-purple-600' },
  { id: 'cars', label: 'Car Rental', icon: Car, color: 'from-emerald-500 to-teal-600' },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils, color: 'from-orange-500 to-red-600' },
];

// Reliable hardcoded Unsplash photo IDs for popular destinations
const DEST_PHOTOS = {
  paris: ['photo-1502602898657-3e91760cbb34', 'photo-1431274172761-fcdab704a5ea', 'photo-1499856871958-5b9357976b82'],
  tokyo: ['photo-1540959733332-eab4deabeeaf', 'photo-1480796927426-f609979314bd', 'photo-1513407030348-c983a97b98d8'],
  'new york': ['photo-1496442226666-8d4d0e62e6e9', 'photo-1534430480872-3498386e7856', 'photo-1522083165195-3424ed129620'],
  dubai: ['photo-1512453979798-5ea266f8880c', 'photo-1526495124232-a04e1849168c', 'photo-1582672060674-bc2bd808a8b5'],
  london: ['photo-1513635269975-59663e0ac1ad', 'photo-1486325212027-8081e485255e', 'photo-1533929736458-ca588d08c8be'],
  rome: ['photo-1552832230-c0197dd311b5', 'photo-1515542622106-78bda8ba0e5b', 'photo-1529260830199-42c24126f198'],
  bali: ['photo-1537996194471-e657df975ab4', 'photo-1558618666-fcd25c85cd64', 'photo-1518548419970-58e3b4079ab2'],
  santorini: ['photo-1570077188670-e3a8d69ac5ff', 'photo-1533105079780-92b9be482077', 'photo-1601581875309-fafbf2d3ed3a'],
  sydney: ['photo-1506973035872-a4ec16b8e8d9', 'photo-1524293581917-878a6d017c71', 'photo-1549180030-48bf079fb38a'],
  barcelona: ['photo-1539037116277-4db20889f2d4', 'photo-1464790719320-516ecd75af6c', 'photo-1583422409516-2895a77efded'],
  amsterdam: ['photo-1534351590666-13e3e96b5017', 'photo-1584003564911-c4a37a9b6a0e', 'photo-1576924542622-772281b13aa8'],
  maldives: ['photo-1514282401047-d79a71a590e8', 'photo-1573843981267-be1999ff37cd', 'photo-1512100356356-de1b84283e18'],
};

const popularDestinations = [
  { name: 'Paris', country: 'France', photoId: 'photo-1502602898657-3e91760cbb34', rating: 4.9, tag: 'Romantic' },
  { name: 'Tokyo', country: 'Japan', photoId: 'photo-1540959733332-eab4deabeeaf', rating: 4.8, tag: 'Cultural' },
  { name: 'New York', country: 'USA', photoId: 'photo-1496442226666-8d4d0e62e6e9', rating: 4.7, tag: 'Urban' },
  { name: 'Dubai', country: 'UAE', photoId: 'photo-1512453979798-5ea266f8880c', rating: 4.8, tag: 'Luxury' },
  { name: 'Santorini', country: 'Greece', photoId: 'photo-1570077188670-e3a8d69ac5ff', rating: 4.9, tag: 'Scenic' },
  { name: 'Bali', country: 'Indonesia', photoId: 'photo-1537996194471-e657df975ab4', rating: 4.8, tag: 'Tropical' },
  { name: 'Rome', country: 'Italy', photoId: 'photo-1552832230-c0197dd311b5', rating: 4.7, tag: 'Historic' },
  { name: 'Sydney', country: 'Australia', photoId: 'photo-1506973035872-a4ec16b8e8d9', rating: 4.7, tag: 'Coastal' },
];

// Get a reliable Unsplash image URL using a known photo ID or a search fallback
const getPhotoUrl = (photoId, w = 800, h = 500) =>
  `https://images.unsplash.com/${photoId}?w=${w}&h=${h}&fit=crop&auto=format`;

// For AI-returned keywords, use Unsplash search (more reliable with known terms)
const getSearchPhotoUrl = (keyword, w = 800, h = 500, page = 1) => {
  const clean = encodeURIComponent(keyword.toLowerCase().trim());
  return `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=${w}&h=${h}&fit=crop`; // fallback base
};

// Look up hardcoded photo or fall back to a known travel photo
const getDestPhoto = (destName, idx = 0) => {
  const key = destName?.toLowerCase();
  for (const [k, ids] of Object.entries(DEST_PHOTOS)) {
    if (key?.includes(k)) return getPhotoUrl(ids[idx % ids.length]);
  }
  // Fallback: generic travel photos
  const fallbacks = [
    'photo-1488085061387-422e29b40080',
    'photo-1469854523086-cc02fe5d8800',
    'photo-1530521954074-e64f6810b32d',
    'photo-1476514525535-07fb3b4ae5f1',
  ];
  return getPhotoUrl(fallbacks[idx % fallbacks.length]);
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'attractions', label: 'Attractions', icon: Landmark },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'practical', label: 'Practical', icon: ShieldCheck },
  { id: 'gems', label: 'Hidden Gems', icon: Sparkles },
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
      prompt: `You are a professional travel guide. Provide a detailed, enthusiastic travel guide for: "${query}".
      Return factual, specific information.
      
      IMPORTANT for photo_urls: You MUST provide 6 real, working, publicly accessible image URLs of famous landmarks or scenery in this destination.
      Use real URLs from Wikipedia Commons, well-known travel sites, or any publicly accessible CDN. 
      Format: direct image URLs ending in .jpg or .png that work without authentication.
      Example format: https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg
      But use ACTUAL landmark photos for ${query}, not ants. Each URL should show a different iconic landmark or scene.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          destination_name: { type: 'string' },
          tagline: { type: 'string' },
          overview: { type: 'string' },
          best_time: { type: 'string' },
          weather: { type: 'string' },
          language: { type: 'string' },
          currency: { type: 'string' },
          timezone: { type: 'string' },
          safety_score: { type: 'number' },
          budget_per_day: { type: 'string' },
          attractions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                tip: { type: 'string' }
              }
            }
          },
          cuisine: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, description: { type: 'string' } }
            }
          },
          cultural_tips: { type: 'array', items: { type: 'string' } },
          budget_tips: { type: 'array', items: { type: 'string' } },
          hidden_gems: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, description: { type: 'string' } }
            }
          },
          photo_spots: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of 6 iconic photo spots / landmarks'
          },
          photo_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of 6 real, working, publicly accessible image URLs (.jpg or .png) of famous landmarks in this destination from Wikipedia Commons or similar public sources'
          }
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

  // Get hero image for the destination
  const heroUrl = travelData ? getDestPhoto(travelData.destination_name, activePhotoIdx) : '';

  // Number of gallery dots
  const galleryCount = Math.min(travelData?.photo_spots?.length || 3, 6);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore the <span className="gradient-text">World</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            AI-powered travel guides with real photos, tips, and instant booking
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
              {loading
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Exploring...</>
                : <><Sparkles className="w-5 h-5 mr-2" />Explore with AI</>}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {bookingCategories.map((cat) => (
              <button key={cat.id} onClick={() => handleBookingClick(cat.id)}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20">
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
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-16 text-center mb-8">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Globe className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-xl font-semibold text-white mb-2">AI is discovering {destination}...</p>
              <p className="text-zinc-400">Gathering photos, tips, food, and hidden gems</p>
            </motion.div>
          )}

          {/* Results */}
          {travelData && !loading && (
            <motion.div key="results" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Hero Card */}
              <div className="glass rounded-3xl overflow-hidden">
                {/* Main Hero Image */}
                <div className="relative h-80 md:h-[440px] overflow-hidden bg-zinc-900">
                  <img
                    key={activePhotoIdx}
                    src={heroUrl}
                    alt={travelData.destination_name}
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* Dot nav */}
                  <div className="absolute bottom-20 right-5 flex gap-2">
                    {Array.from({ length: galleryCount }).map((_, i) => (
                      <button key={i} onClick={() => setActivePhotoIdx(i)}
                        className={`rounded-full transition-all duration-300 ${i === activePhotoIdx ? 'bg-white w-6 h-2' : 'bg-white/40 w-2 h-2 hover:bg-white/70'}`} />
                    ))}
                  </div>

                  {/* Camera label */}
                  {travelData.photo_spots?.[activePhotoIdx] && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white border border-white/10">
                      <Camera className="w-3 h-3 text-indigo-300" />
                      {travelData.photo_spots[activePhotoIdx]}
                    </div>
                  )}

                  <div className="absolute bottom-5 left-6 right-6">
                    <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">{travelData.destination_name}</h2>
                    <p className="text-zinc-200 mt-1 italic text-lg drop-shadow">{travelData.tagline}</p>
                  </div>
                </div>

                {/* Photo Thumbnails Row */}
                <div className="flex gap-1.5 p-2 bg-black/40 overflow-x-auto">
                  {Array.from({ length: galleryCount }).map((_, i) => (
                    <button key={i} onClick={() => setActivePhotoIdx(i)}
                      className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${i === activePhotoIdx ? 'border-indigo-500' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      style={{ width: 72, height: 50 }}>
                      <img
                        src={getDestPhoto(travelData.destination_name, i)}
                        alt={travelData.photo_spots?.[i] || travelData.destination_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/5 bg-zinc-900/70">
                  {[
                    { icon: Calendar, label: 'Best Time', value: travelData.best_time },
                    { icon: DollarSign, label: 'Budget/Day', value: travelData.budget_per_day },
                    { icon: Thermometer, label: 'Climate', value: travelData.weather?.split('.')[0] },
                    { icon: Globe, label: 'Language', value: travelData.language },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
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

              {/* Tabs Panel */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="flex overflow-x-auto border-b border-white/5">
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 border-b-2
                        ${activeTab === tab.id ? 'text-white border-indigo-500 bg-white/5' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* Overview */}
                  {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <p className="text-zinc-200 text-lg leading-relaxed">{travelData.overview}</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="glass rounded-xl p-4 space-y-3">
                          <h4 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">Quick Info</h4>
                          {[
                            { label: 'Currency', value: travelData.currency },
                            { label: 'Timezone', value: travelData.timezone },
                            { label: 'Language', value: travelData.language },
                            { label: 'Budget / Day', value: travelData.budget_per_day },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
                              <span className="text-zinc-500">{item.label}</span>
                              <span className="text-white font-medium">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="glass rounded-xl p-4">
                          <h4 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-3">Safety Score</h4>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex gap-1.5">
                              {[1,2,3,4,5].map(s => (
                                <div key={s} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                                  ${s <= (travelData.safety_score || 0) ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-500'}`}>
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-zinc-400 text-sm">{travelData.safety_score >= 4 ? '✅ Very safe for tourists' : travelData.safety_score >= 3 ? '⚠️ Generally safe, stay alert' : '🔴 Exercise caution'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Attractions */}
                  {activeTab === 'attractions' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
                      {travelData.attractions?.map((attraction, i) => (
                        <div key={i} className="group glass rounded-xl overflow-hidden hover:border-indigo-500/40 transition-all border border-white/5">
                          <div className="h-40 overflow-hidden bg-zinc-800 relative">
                            <img
                              src={getDestPhoto(travelData.destination_name, i)}
                              alt={attraction.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                              <h4 className="font-bold text-white text-base">{attraction.name}</h4>
                              {attraction.category && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/80 text-white flex-shrink-0 ml-2">{attraction.category}</span>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-zinc-400 text-sm mb-2">{attraction.description}</p>
                            {attraction.tip && (
                              <p className="text-xs text-indigo-300 bg-indigo-500/10 rounded-lg px-3 py-2 border border-indigo-500/20">
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
                            <div className="h-32 overflow-hidden bg-zinc-800 relative">
                              <img
                                src={getDestPhoto(travelData.destination_name, (i + 2) % 6)}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                              <h4 className="absolute bottom-2 left-3 font-bold text-white text-sm">{item.name}</h4>
                            </div>
                            <div className="p-3">
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
                              <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>{tip}
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
                          <div className="h-36 overflow-hidden bg-zinc-800 relative">
                            <img
                              src={getDestPhoto(travelData.destination_name, (i + 3) % 6)}
                              alt={gem.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <h4 className="font-bold text-white text-sm">{gem.name}</h4>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-zinc-400 text-sm">{gem.description}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Book CTAs */}
                <div className="px-6 pb-6 flex flex-wrap gap-3 border-t border-white/5 pt-4">
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
                      src={getPhotoUrl(dest.photoId, 600, 400)}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-indigo-500/80 text-white backdrop-blur-sm">{dest.tag}</span>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-bold text-lg text-white">{dest.name}</h3>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-zinc-300 text-sm">{dest.country}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-zinc-200 font-medium">{dest.rating}</span>
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