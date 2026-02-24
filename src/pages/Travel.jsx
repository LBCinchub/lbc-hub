import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, Car, Utensils, Search, MapPin, 
  Sparkles, Loader2, ExternalLink, Calendar, Users,
  ArrowRight, Star
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bookingCategories = [
  { id: 'flights', label: 'Flights', icon: Plane, color: 'from-sky-500 to-blue-600' },
  { id: 'hotels', label: 'Hotels', icon: Hotel, color: 'from-violet-500 to-purple-600' },
  { id: 'cars', label: 'Car Rental', icon: Car, color: 'from-emerald-500 to-teal-600' },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils, color: 'from-orange-500 to-red-600' },
];

const popularDestinations = [
  { name: 'Paris, France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', rating: 4.9 },
  { name: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop', rating: 4.8 },
  { name: 'New York, USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop', rating: 4.7 },
  { name: 'Dubai, UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', rating: 4.8 },
];

export default function Travel() {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [travelTips, setTravelTips] = useState(null);
  const [activeTab, setActiveTab] = useState('tips');

  const handleSearch = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    setTravelTips(null);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide comprehensive travel tips for visiting ${destination}. Include:
        1. Best time to visit
        2. Top 5 must-see attractions
        3. Local cuisine recommendations
        4. Cultural tips and etiquette
        5. Budget tips
        6. Safety advice
        Be concise but informative.`,
      response_json_schema: {
        type: 'object',
        properties: {
          best_time: { type: 'string' },
          attractions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } },
          cuisine: { type: 'array', items: { type: 'string' } },
          cultural_tips: { type: 'array', items: { type: 'string' } },
          budget_tips: { type: 'array', items: { type: 'string' } },
          safety: { type: 'string' }
        }
      },
      add_context_from_internet: true
    });

    setTravelTips(response);
    setLoading(false);
  };

  const handleBookingClick = (category) => {
    const searchQuery = encodeURIComponent(destination || 'travel');
    const urls = {
      flights: `https://www.google.com/travel/flights?q=${searchQuery}`,
      hotels: `https://www.google.com/travel/hotels?q=${searchQuery}`,
      cars: `https://www.google.com/search?q=car+rental+${searchQuery}`,
      restaurants: `https://www.google.com/maps/search/restaurants+${searchQuery}`,
    };
    window.open(urls[category], '_blank');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Plan Your Perfect
            <span className="gradient-text"> Adventure</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Get personalized travel tips and book flights, hotels, cars, and restaurants—all in one place
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 md:p-8 mb-8 glow"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Where do you want to go? (e.g., Paris, Tokyo)"
                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 rounded-xl text-lg"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={loading || !destination.trim()}
              className="h-14 px-8 btn-primary rounded-xl text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Getting Tips...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Travel Tips
                </>
              )}
            </Button>
          </div>

          {/* Booking Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {bookingCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleBookingClick(category.id)}
                className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:border-white/20"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                  <category.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium">{category.label}</span>
                <ExternalLink className="w-4 h-4 ml-auto text-zinc-500 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-16 text-center"
            >
              <Loader2 className="w-12 h-12 mx-auto text-indigo-400 animate-spin mb-4" />
              <p className="text-zinc-400">Gathering the best tips for {destination}...</p>
            </motion.div>
          )}

          {travelTips && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-indigo-400" />
                  Travel Guide: {destination}
                </h2>
              </div>

              <Tabs defaultValue="tips" className="w-full">
                <TabsList className="w-full justify-start p-2 bg-white/5 rounded-none border-b border-white/10">
                  <TabsTrigger value="tips" className="data-[state=active]:bg-indigo-500">Tips & Info</TabsTrigger>
                  <TabsTrigger value="attractions" className="data-[state=active]:bg-indigo-500">Attractions</TabsTrigger>
                  <TabsTrigger value="food" className="data-[state=active]:bg-indigo-500">Food & Culture</TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="tips" className="mt-0 space-y-6">
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        Best Time to Visit
                      </h3>
                      <p className="text-zinc-300">{travelTips.best_time}</p>
                    </div>

                    <div className="glass rounded-xl p-5">
                      <h3 className="font-semibold text-lg mb-3">💰 Budget Tips</h3>
                      <ul className="space-y-2">
                        {travelTips.budget_tips?.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-zinc-300">
                            <span className="text-emerald-400 mt-1">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass rounded-xl p-5">
                      <h3 className="font-semibold text-lg mb-2">🛡️ Safety Information</h3>
                      <p className="text-zinc-300">{travelTips.safety}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="attractions" className="mt-0">
                    <div className="grid md:grid-cols-2 gap-4">
                      {travelTips.attractions?.map((attraction, i) => (
                        <div key={i} className="glass rounded-xl p-5">
                          <h4 className="font-semibold text-lg mb-2">{attraction.name}</h4>
                          <p className="text-zinc-400 text-sm">{attraction.description}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="food" className="mt-0 space-y-6">
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-semibold text-lg mb-3">🍽️ Must-Try Local Cuisine</h3>
                      <div className="flex flex-wrap gap-2">
                        {travelTips.cuisine?.map((item, i) => (
                          <span key={i} className="px-4 py-2 rounded-full bg-orange-500/20 text-orange-300 text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass rounded-xl p-5">
                      <h3 className="font-semibold text-lg mb-3">🎭 Cultural Tips</h3>
                      <ul className="space-y-2">
                        {travelTips.cultural_tips?.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-zinc-300">
                            <span className="text-violet-400 mt-1">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popular Destinations */}
        {!travelTips && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularDestinations.map((dest, index) => (
                <motion.div
                  key={dest.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => {
                    setDestination(dest.name);
                    handleSearch();
                  }}
                  className="group glass rounded-2xl overflow-hidden cursor-pointer card-hover"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={dest.image} 
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-semibold text-lg">{dest.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-zinc-300">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        {dest.rating}
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